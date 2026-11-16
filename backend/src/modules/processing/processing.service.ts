import { ConflictException, GoneException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ENGINE_VERSION, processSnapshot, sameCell, type Snapshot } from '@dashboard/data-core';
import { canonicalRequest } from '../../common/domain/canonical-request';
import { IdempotencyService, sha256 } from '../../infrastructure/idempotency/idempotency.service';
import type { Principal } from '../auth/security/auth-context';
import { OwnershipService } from '../auth/security/ownership.service';
import { DatasetsService, publicRow } from '../datasets/datasets.service';
import { DatasetsRepository } from '../datasets/datasets.repository';
import { SnapshotPublisherService } from '../datasets/snapshot-publisher.service';
import { buildDiagnostics, assertPreviewApplicable } from './preview-policy';
import { assertPreviewReadable } from './preview-read-policy';
import { projectPreview } from './preview-projection';
import { ProcessingRepository, type PreviewRecord } from './processing.repository';
import type { ApplyPreviewDto, CreatePreviewDto } from './dto/processing.dto';
import type { CellOutputDto } from '../../common/dto/cell.dto';
import type { CreatePreviewResponseDto, PreviewChangeDto, PreviewResponseDto, ApplyPreviewResponseDto } from './dto/processing-response.dto';
import type { PreviewQueryDto } from './dto/preview-query.validation';

const PREVIEW_TTL_MS = 30 * 60 * 1000;
const CHANGE_BATCH_SIZE = 500;
/** ID canonicalization is part of the contract; never alter user text/categorical values. */
function normalizeCreate(body: CreatePreviewDto): CreatePreviewDto {
  const scope = body.specification.scope;
  const normalizedScope = scope.type === 'cell'
    ? { type: 'cell' as const, rowId: scope.rowId.toLowerCase(), columnId: scope.columnId.toLowerCase() }
    : scope.type === 'columns'
      ? { type: 'columns' as const, columnIds: scope.columnIds.map(id => id.toLowerCase()) }
      : { type: 'dataset' as const };
  return { baseVersionId: body.baseVersionId.toLowerCase(), specification: { ...body.specification, scope: normalizedScope } } as CreatePreviewDto;
}

function publicPreview(record: PreviewRecord): CreatePreviewResponseDto {
  const candidateVersionId = record.candidateVersionId?.toHexString() ?? null;
  return {
    previewId: record._id.toHexString(),
    status: record.status === 'applied' ? 'ready' : record.status === 'invalid' ? 'invalid' : 'ready',
    canApply: record.status === 'ready' && candidateVersionId !== null,
    baseVersionId: record.baseVersionId.toHexString(), candidateVersionId,
    engineVersion: record.specification.engineVersion, specHash: record.specHash,
    summary: record.summary, schemaChanges: record.schemaChanges, diagnostics: record.diagnostics,
    expiresAt: record.expiresAt.toISOString(),
  };
}
function outputCells(row: Snapshot['rows'][number] | undefined): PreviewChangeDto['beforeCells'] {
  return row ? publicRow(row).cells as Record<string, CellOutputDto> : null;
}
function diffColumnIds(before: Snapshot['rows'][number] | undefined, after: Snapshot['rows'][number] | undefined): string[] {
  const ids = new Set([...Object.keys(before?.cells ?? {}), ...Object.keys(after?.cells ?? {})]);
  return [...ids].filter(id => {
    const oldValue = before?.cells[id], newValue = after?.cells[id];
    return !oldValue || !newValue || !sameCell(oldValue, newValue);
  });
}

@Injectable()
export class ProcessingService {
  constructor(
    private readonly repository: ProcessingRepository,
    private readonly datasets: DatasetsService,
    private readonly datasetRecords: DatasetsRepository,
    private readonly publisher: SnapshotPublisherService,
    private readonly receipts: IdempotencyService,
    private readonly ownership: OwnershipService,
  ) {}

  async createPreview(principal: Principal, datasetId: string, body: CreatePreviewDto, key: string): Promise<CreatePreviewResponseDto> {
    const dataset = await this.ownership.dataset(datasetId, principal, true);
    const projectId = dataset.projectId.toHexString();
    body = normalizeCreate(body);
    const claim = await this.receipts.claim(principal, projectId, `v1.datasets.${datasetId}.previews.create`, key, body);
    if (claim.replay) {
      const replay = claim.body as CreatePreviewResponseDto;
      const existing = await this.repository.get(datasetId, replay.previewId);
      assertPreviewReadable(existing, new Date());
      return replay;
    }
    return this.receipts.run(claim.lease, async () => {
      const current = await this.datasetRecords.byId(datasetId);
      if (current.lifecycle !== 'ready' || current.currentVersionId?.toHexString() !== body.baseVersionId)
        throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản dữ liệu đã thay đổi' });
      const baseRevision = current.revision;
      const base = await this.datasets.readSnapshot(principal, datasetId, body.baseVersionId);
      const specification = { ...body.specification, engineVersion: ENGINE_VERSION };
      const specHash = sha256(canonicalRequest(specification));
      const evaluated = processSnapshot(base, body.specification);
      const outcome = evaluated.errors.length ? 'invalid' : 'ready';
      const projected = projectPreview(base, outcome === 'ready' ? evaluated.snapshot : base, body.specification);
      const diagnostics = buildDiagnostics(evaluated.errors, evaluated.warnings);
      // Candidate staging happens outside the publication transaction; no-op/invalid have no candidate.
      const candidate = outcome === 'ready' && evaluated.canApply
        ? await this.publisher.prepare(claim.lease, datasetId, body.baseVersionId, evaluated.snapshot)
        : null;
      const createdAt = new Date(), previewId = new Types.ObjectId();
      const record: PreviewRecord = {
        _id: previewId, datasetId: new Types.ObjectId(datasetId), baseVersionId: new Types.ObjectId(body.baseVersionId),
        baseRevision, candidateVersionId: candidate ? new Types.ObjectId(candidate) : null,
        specification, specHash, status: 'building', summary: projected.summary,
        schemaChanges: projected.schemaChanges, diagnostics, createdAt, expiresAt: new Date(createdAt.getTime() + PREVIEW_TTL_MS),
      };
      // Stage row-change index in bounded transactions; no partially built preview is readable.
      await this.repository.transaction(async session => { await this.receipts.touch(claim.lease, session); await this.repository.insert(record, session); });
      for (let i = 0; i < projected.changes.length; i += CHANGE_BATCH_SIZE) {
        const batch = projected.changes.slice(i, i + CHANGE_BATCH_SIZE);
        await this.repository.transaction(async session => { await this.receipts.touch(claim.lease, session); await this.repository.insertChanges(previewId, batch, session); });
      }
      const response: CreatePreviewResponseDto = { ...publicPreview({ ...record, status: outcome }), status: outcome };
      await this.repository.transaction(async session => {
        await this.receipts.touch(claim.lease, session);
        await this.repository.ready(previewId, outcome, session);
        await this.receipts.complete(claim.lease, 201, response, session);
      });
      return response;
    });
  }

  async getPreview(principal: Principal, datasetId: string, previewId: string, query: PreviewQueryDto): Promise<PreviewResponseDto> {
    await this.ownership.dataset(datasetId, principal);
    const preview = await this.repository.get(datasetId, previewId);
    assertPreviewReadable(preview, new Date());
    if (preview.status === 'building') throw new ConflictException({ code: 'PREVIEW_PENDING', message: 'Preview đang được tạo' });
    if (preview.status === 'expired') throw new GoneException({ code: 'PREVIEW_EXPIRED', message: 'Preview đã hết hạn' });
    const { items, total } = await this.repository.listChanges(preview._id, query.page, query.limit);
    const base = await this.datasets.readSnapshot(principal, datasetId, preview.baseVersionId.toHexString());
    const after = !preview.candidateVersionId ? base : preview.status === 'applied'
      ? await this.datasets.readSnapshot(principal, datasetId, preview.candidateVersionId.toHexString())
      : await this.datasets.readPreviewCandidate(principal, datasetId, preview.candidateVersionId.toHexString());
    const beforeRows = new Map(base.rows.map(row => [row.rowId, row]));
    const afterRows = new Map(after.rows.map(row => [row.rowId, row]));
    const changes: PreviewChangeDto[] = items.map(item => {
      const before = beforeRows.get(item.rowId), next = afterRows.get(item.rowId);
      return {
        rowId: item.rowId, ordinal: item.ordinal, changeKind: item.changeKind,
        beforePosition: item.beforePosition, afterPosition: item.afterPosition,
        beforeCells: outputCells(before), afterCells: outputCells(next),
        diffColumnIds: diffColumnIds(before, next),
      };
    });
    const metadata = publicPreview(preview);
    return {
      preview: { ...metadata, status: preview.status === 'applied' ? 'applied' : preview.status === 'invalid' ? 'invalid' : 'ready' },
      changes, page: query.page, limit: query.limit, totalChanges: total, totalPages: Math.ceil(total / query.limit),
    };
  }

  async apply(principal: Principal, datasetId: string, body: ApplyPreviewDto, key: string): Promise<ApplyPreviewResponseDto> {
    const dataset = await this.ownership.dataset(datasetId, principal, true);
    const projectId = dataset.projectId.toHexString();
    body = { previewId: body.previewId.toLowerCase() };
    // Claim before stale/apply checks: a committed request must replay after the dataset advances.
    const claim = await this.receipts.claim(principal, projectId, `v1.datasets.${datasetId}.operations.apply`, key, body);
    if (claim.replay) return claim.body as ApplyPreviewResponseDto;
    return this.receipts.run(claim.lease, async () => {
      const preview = await this.repository.get(datasetId, body.previewId);
      assertPreviewReadable(preview, new Date());
      if (preview.status === 'applied') throw new ConflictException({ code: 'PREVIEW_ALREADY_APPLIED', message: 'Preview đã được áp dụng' });
      if (preview.status === 'building') throw new ConflictException({ code: 'PREVIEW_PENDING', message: 'Preview đang được tạo' });
      assertPreviewApplicable({ status: preview.status === 'invalid' ? 'invalid' : 'ready', canApply: preview.status === 'ready' && !!preview.candidateVersionId, diagnostics: preview.diagnostics });
      if (sha256(canonicalRequest(preview.specification)) !== preview.specHash)
        throw new ConflictException({ code: 'SPEC_HASH_MISMATCH', message: 'Cấu hình preview không còn hợp lệ' });
      const current = await this.datasetRecords.byId(datasetId);
      if (current.lifecycle !== 'ready' || current.currentVersionId?.toHexString() !== preview.baseVersionId.toHexString() || current.revision !== preview.baseRevision)
        throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản dữ liệu đã thay đổi' });
      const candidateVersionId = preview.candidateVersionId!.toHexString();
      return this.publisher.publish(claim.lease, {
        datasetId, candidateVersionId, expectedCurrentVersionId: preview.baseVersionId.toHexString(), expectedRevision: preview.baseRevision,
        kind: 'process', specification: preview.specification, summary: preview.summary,
      }, (_versionNumber, operationId, createdAt): ApplyPreviewResponseDto => ({
        operation: { _id: operationId, kind: 'process', baseVersionId: preview.baseVersionId.toHexString(), resultVersionId: candidateVersionId, summary: preview.summary, createdAt: createdAt.toISOString() },
        dataset: { currentVersionId: candidateVersionId, revision: preview.baseRevision + 1 },
      }), session => this.repository.markApplied(preview, session));
    });
  }
}
