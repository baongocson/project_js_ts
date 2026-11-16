import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import type { Principal } from './auth-context';

interface Project { _id: Types.ObjectId; ownerId: Types.ObjectId; lifecycle: string; writeEpoch: number }
interface Dataset { _id: Types.ObjectId; projectId: Types.ObjectId }
interface Version { _id: Types.ObjectId; datasetId: Types.ObjectId; state: string }
interface Preview { _id: Types.ObjectId; datasetId: Types.ObjectId }
@Injectable()
export class OwnershipService {
  constructor(@Optional() @InjectConnection() private readonly connection?: Connection) {}
  private db() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db;
  }
  objectId(value: string): Types.ObjectId {
    if (!/^[a-fA-F0-9]{24}$/.test(value)) throw new BadRequestException({ code: 'INVALID_ID', message: 'ID không hợp lệ' });
    return new Types.ObjectId(value);
  }
  async project(projectId: string, principal: Principal, write = false): Promise<Project> {
    const project = await this.db().collection<Project>('projects').findOne({ _id: this.objectId(projectId) });
    if (!project) this.missing();
    if (project.ownerId.toHexString() !== principal.userId) this.forbidden();
    if (project.lifecycle === 'deleting') {
      if (write) throw new ConflictException({ code: 'RESOURCE_DELETING', message: 'Project đang được xóa' });
      this.missing();
    }
    return project;
  }
  async dataset(datasetId: string, principal: Principal, write = false): Promise<Dataset> {
    const dataset = await this.db().collection<Dataset>('datasets').findOne({ _id: this.objectId(datasetId) });
    if (!dataset) this.missing();
    await this.project(dataset.projectId.toHexString(), principal, write);
    return dataset;
  }
  async version(datasetId: string, versionId: string): Promise<void> {
    const version = await this.db().collection<Version>('datasetVersions').findOne({ _id: this.objectId(versionId), datasetId: this.objectId(datasetId), state: 'published' });
    if (!version) throw new NotFoundException({ code: 'VERSION_NOT_FOUND', message: 'Không tìm thấy phiên bản đã công bố' });
  }
  async preview(datasetId: string, previewId: string): Promise<void> {
    if (!await this.db().collection<Preview>('processingPreviews').findOne({ _id: this.objectId(previewId), datasetId: this.objectId(datasetId) })) this.missing();
  }
  /** BE-2/3 must call this inside EVERY mutation/publish transaction, not just in a guard. */
  async fence(principal: Principal, projectId: string | undefined, session: ClientSession): Promise<void> {
    const user = await this.db().collection('users').updateOne(
      { _id: this.objectId(principal.userId), lifecycle: 'active' }, { $inc: { writeEpoch: 1 } }, { session },
    );
    if (!user.matchedCount) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
    if (projectId) {
      const project = await this.db().collection('projects').updateOne(
        { _id: this.objectId(projectId), ownerId: this.objectId(principal.userId), lifecycle: { $in: ['empty', 'ready'] } },
        { $inc: { writeEpoch: 1 } }, { session },
      );
      if (!project.matchedCount) throw new ConflictException({ code: 'RESOURCE_DELETING', message: 'Project không còn cho phép ghi' });
    }
    // A session can be revoked between guard and transaction, so recheck it in the write set.
    const filter = { _id: this.objectId(principal.sessionId), userId: this.objectId(principal.userId), revokedAt: null, expiresAt: { $gt: new Date() } };
    const current = await this.db().collection('authSessions').findOne(filter, { session });
    if (!current) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
    // Force a real write even when two mutations happen in the same millisecond.
    // A no-op timestamp update would not provide a reliable conflict with logout.
    const prior = current.lastUsedAt instanceof Date ? current.lastUsedAt.getTime() : 0;
    const authSession = await this.db().collection('authSessions').updateOne(filter,
      { $set: { lastUsedAt: new Date(Math.max(Date.now(), prior + 1)) } }, { session },
    );
    if (!authSession.matchedCount) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
  }
  private missing(): never { throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên' }); }
  private forbidden(): never { throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Không có quyền truy cập tài nguyên' }); }
}
