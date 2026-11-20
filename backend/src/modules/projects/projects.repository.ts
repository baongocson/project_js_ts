import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { ProjectRecord, WorkspaceRecord } from '../../infrastructure/database/be2-records';
import type { ListProjectsQueryDto } from './dto/project.dto';
@Injectable()
export class ProjectsRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) { super(connection); }
  async create(project: ProjectRecord, workspace: WorkspaceRecord, session: ClientSession): Promise<void> {
    await this.db().collection<ProjectRecord>('projects').insertOne(project, { session });
    await this.db().collection<WorkspaceRecord>('workspaces').insertOne(workspace, { session });
  }
  async list(ownerId: string, query: ListProjectsQueryDto) {
    const filter = { ownerId: new Types.ObjectId(ownerId), lifecycle: query.lifecycle ?? { $in: ['empty', 'ready'] as const } };
    const field = query.sort.replace(/^-/, ''), direction = query.sort.startsWith('-') ? -1 : 1;
    const total = await this.db().collection<ProjectRecord>('projects').countDocuments(filter);
    // Out-of-range pages are valid and empty, including a safe page number whose
    // page*limit would otherwise overflow the driver's safe integer skip range.
    const items = query.page > Math.ceil(total / query.limit) ? [] : await this.db().collection<ProjectRecord>('projects').find(filter).sort({ [field]: direction, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray();
    return { items, page: query.page, limit: query.limit, total };
  }
  async get(id: string, session?: ClientSession) {
    const project = await this.db().collection<ProjectRecord>('projects').findOne({ _id: new Types.ObjectId(id), lifecycle: { $ne: 'deleting' } }, { session });
    if (!project) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy project' });
    return project;
  }
  async workspace(projectId: string, session?: ClientSession) {
    const workspace = await this.db().collection<WorkspaceRecord>('workspaces').findOne({ projectId: new Types.ObjectId(projectId) }, { session });
    if (!workspace) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy workspace' });
    return workspace;
  }
  async rename(id: string, name: string, session: ClientSession) {
    const updatedAt = new Date();
    await this.db().collection<ProjectRecord>('projects').updateOne({ _id: new Types.ObjectId(id), lifecycle: { $ne: 'deleting' } }, { $set: { name, updatedAt } }, { session });
    return { _id: id, name, updatedAt };
  }
  async saveWorkspace(before: WorkspaceRecord, next: WorkspaceRecord, session: ClientSession): Promise<void> {
    const result = await this.db().collection<WorkspaceRecord>('workspaces').replaceOne({ _id: before._id, revision: before.revision, boundVersionId: before.boundVersionId }, next, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'WORKSPACE_REVISION_CONFLICT', message: 'Workspace đã thay đổi' });
  }
  async markDeleting(id: string, session: ClientSession): Promise<void> {
    const result = await this.db().collection<ProjectRecord>('projects').updateOne({ _id: new Types.ObjectId(id), lifecycle: { $in: ['empty', 'ready'] } }, { $set: { lifecycle: 'deleting', updatedAt: new Date() }, $inc: { writeEpoch: 1 } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'RESOURCE_DELETING', message: 'Project đang xóa' });
  }
  async deletingIds(): Promise<Types.ObjectId[]> {
    return (await this.db().collection<ProjectRecord>('projects').find({ lifecycle: 'deleting' }, { projection: { _id: 1 } }).toArray()).map(project => project._id);
  }
  async bindImport(projectId: string, versionId: Types.ObjectId, session: ClientSession): Promise<void> {
    const result = await this.db().collection<ProjectRecord>('projects').updateOne({ _id: new Types.ObjectId(projectId), lifecycle: 'empty' }, { $set: { lifecycle: 'ready', updatedAt: new Date() } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'DATASET_ALREADY_EXISTS', message: 'Project không còn rỗng' });
    await this.db().collection<WorkspaceRecord>('workspaces').updateOne({ projectId: new Types.ObjectId(projectId) }, { $set: { boundVersionId: versionId, updatedAt: new Date() }, $inc: { revision: 1 } }, { session });
  }
}
