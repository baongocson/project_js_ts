import { ConflictException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { ProjectsRepository } from './projects.repository';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';
import type { ProjectRecord, WorkspaceRecord } from '../../infrastructure/database/be2-records';
import type { ProjectNameDto, ListProjectsQueryDto } from './dto/project.dto';
import type { PatchWorkspaceDto } from './dto/workspace.dto';
import { planWorkspacePatch, type StoredWorkspace } from './workspace-policy';
import { canonicalRequest } from '../../common/domain/canonical-request';
import { DatasetsService } from '../datasets/datasets.service';
import { publicDataset } from '../datasets/dataset-mappers';
import { AccountCleanupService } from '../../infrastructure/database/account-cleanup.service';
import { normalizeWorkspace } from './workspace-normalization';
function projectDto(project: ProjectRecord) { return { _id: project._id.toHexString(), name: project.name, lifecycle: project.lifecycle, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString() }; }
function workspaceDto(workspace: WorkspaceRecord) {
  return { _id: workspace._id.toHexString(), revision: workspace.revision, boundVersionId: workspace.boundVersionId?.toHexString() ?? null, activeTab: workspace.activeTab, chartConfig: workspace.chartConfig, selection: workspace.selection, tableState: workspace.tableState, updatedAt: workspace.updatedAt.toISOString() };
}
@Injectable()
export class ProjectsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ProjectsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sweepTask?: Promise<void>;
  constructor(private readonly repository: ProjectsRepository, private readonly ownership: OwnershipService, private readonly idempotency: IdempotencyService, private readonly datasets: DatasetsService, private readonly cleanup: AccountCleanupService, private readonly config: ConfigService) {}
  async create(principal: Principal, body: ProjectNameDto, key: string) {
    const claim = await this.idempotency.claim(principal, undefined, 'v1.projects.create', key, body);
    if (claim.replay) return claim.body;
    const lease = claim.lease;
    return this.idempotency.run(lease, () => this.repository.transaction(async session => {
      await this.idempotency.touch(lease, session);
      const now = new Date(), id = new Types.ObjectId();
      const project: ProjectRecord = { _id: id, ownerId: new Types.ObjectId(principal.userId), name: body.name, lifecycle: 'empty', writeEpoch: 0, createdAt: now, updatedAt: now };
      const workspace: WorkspaceRecord = { _id: new Types.ObjectId(), projectId: id, boundVersionId: null, revision: 1, activeTab: 'collection', chartConfig: { xColumnId: null, yColumnId: null, zColumnId: null, colorMode: 'normal', outlierColumnIds: [], outlierMethod: 'iqr', threshold: 1.5 }, selection: { columnIds: [], cell: null }, tableState: { filters: [], sort: null, page: 1, pageSize: 10 }, updatedAt: now };
      await this.repository.create(project, workspace, session);
      const response = { project: projectDto(project), workspace: { _id: workspace._id.toHexString(), revision: 1, activeTab: 'collection' } };
      await this.idempotency.complete(lease, 201, response, session, id.toHexString());
      return response;
    }));
  }
  async list(principal: Principal, query: ListProjectsQueryDto) {
    const result=await this.repository.list(principal.userId,query);
    return {...result,items:result.items.map(item=>({_id:item._id.toHexString(),name:item.name,lifecycle:item.lifecycle,updatedAt:item.updatedAt.toISOString()}))};
  }
  async get(principal: Principal, projectId: string) {
    await this.ownership.project(projectId, principal);
    const project = await this.repository.get(projectId), stored = await this.repository.workspace(projectId);
    const dataset = await this.datasets.projectDataset(projectId);
    const snapshot = dataset?.currentVersionId ? await this.datasets.readSnapshot(principal, dataset._id.toHexString(), dataset.currentVersionId.toHexString()) : null;
    const normalized = normalizeWorkspace(workspaceDto(stored), snapshot);
    return { project: projectDto(project), workspace: { ...normalized.workspace, boundVersionId: dataset?.currentVersionId?.toHexString() ?? null }, dataset: dataset?.lifecycle === 'ready' ? publicDataset(dataset) : null, workspaceAdjusted: normalized.adjustments.length > 0, adjustments: normalized.adjustments };
  }
  async rename(principal: Principal, projectId: string, body: ProjectNameDto) {
    await this.ownership.project(projectId, principal, true);
    return this.repository.transaction(async session => { await this.ownership.fence(principal, projectId, session); const result=await this.repository.rename(projectId, body.name, session); return {...result,updatedAt:result.updatedAt.toISOString()}; });
  }
  async saveWorkspace(principal: Principal, projectId: string, patch: PatchWorkspaceDto) {
    await this.ownership.project(projectId, principal, true);
    const dataset = await this.datasets.projectDataset(projectId);
    const versionId = dataset?.currentVersionId?.toHexString() ?? null;
    const snapshot = versionId && dataset ? await this.datasets.readSnapshot(principal, dataset._id.toHexString(), versionId) : null;
    return this.repository.transaction(async session => {
      await this.ownership.fence(principal, projectId, session);
      // The parent write fence serializes publish against this transaction. Re-read
      // after taking it so a snapshot loaded before publish cannot overwrite new state.
      const currentDataset = await this.datasets.projectDataset(projectId);
      if ((currentDataset?.currentVersionId?.toHexString() ?? null) !== versionId) throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản đã thay đổi' });
      const stored = await this.repository.workspace(projectId, session);
      const state = workspaceDto(stored);
      const planned = planWorkspacePatch(state, patch, versionId);
      const normalized = normalizeWorkspace(planned.workspace, snapshot);
      const comparable = (value: StoredWorkspace) => ({ activeTab: value.activeTab, chartConfig: value.chartConfig, selection: value.selection, tableState: value.tableState, boundVersionId: value.boundVersionId });
      const changed = canonicalRequest(comparable(normalized.workspace)) !== canonicalRequest(comparable(state));
      const next: WorkspaceRecord = { ...stored, activeTab: normalized.workspace.activeTab, chartConfig: normalized.workspace.chartConfig, selection: normalized.workspace.selection, tableState: normalized.workspace.tableState, boundVersionId: versionId ? new Types.ObjectId(versionId) : null, revision: stored.revision + (changed ? 1 : 0), updatedAt: changed ? new Date() : stored.updatedAt };
      await this.repository.saveWorkspace(stored, next, session);
      return { workspace: workspaceDto(next), workspaceAdjusted: normalized.adjustments.length > 0, adjustments: normalized.adjustments };
    });
  }
  async delete(principal: Principal, projectId: string): Promise<void> {
    await this.ownership.project(projectId, principal, true);
    await this.repository.transaction(async session => { await this.ownership.fence(principal, projectId, session); await this.repository.markDeleting(projectId, session); });
    try { await this.cleanup.removeProject(new Types.ObjectId(projectId)); }
    catch (error) { this.logger.error('Project cleanup incomplete; will retry', error instanceof Error ? error.stack : undefined); throw new ServiceUnavailableException({ code: 'SERVICE_UNAVAILABLE', message: 'Chưa xóa xong; recovery sẽ tiếp tục' }); }
  }
  onApplicationBootstrap(): void {
    if (this.config.get('DATABASE_ENABLED') !== 'true' || this.config.get('PROJECT_CLEANUP_ENABLED') === 'false') return;
    this.startSweep(); this.timer = setInterval(() => this.startSweep(), 60_000); this.timer.unref();
  }
  private startSweep(): void {
    if (this.sweepTask) return;
    this.sweepTask = this.recover().catch(() => this.logger.error('Project cleanup incomplete; will retry')).finally(() => { this.sweepTask = undefined; });
  }
  async recover(projectId?: string): Promise<void> {
    for (const id of await this.repository.deletingIds()) {
      if (projectId && id.toHexString() !== projectId) continue;
      try { await this.cleanup.removeProject(id); } catch { this.logger.error('Project cleanup incomplete; will retry'); }
    }
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.sweepTask; }
}
