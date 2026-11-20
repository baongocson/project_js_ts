import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Types, type ClientSession } from 'mongoose';
import type { Principal } from './auth-context';
import { OwnershipRepository, type Project, type Dataset } from './ownership.repository';

@Injectable()
export class OwnershipService {
  constructor(private readonly repository:OwnershipRepository) {}
  objectId(value: string): Types.ObjectId {
    if (!/^[a-fA-F0-9]{24}$/.test(value)) throw new BadRequestException({ code: 'INVALID_ID', message: 'ID không hợp lệ' });
    return new Types.ObjectId(value);
  }
  async project(projectId: string, principal: Principal, write = false): Promise<Project> {
    const project = await this.repository.project(this.objectId(projectId));
    if (!project) this.missing();
    if (project.ownerId.toHexString() !== principal.userId) this.forbidden();
    if (project.lifecycle === 'deleting') {
      if (write) throw new ConflictException({ code: 'RESOURCE_DELETING', message: 'Project đang được xóa' });
      this.missing();
    }
    return project;
  }
  async dataset(datasetId: string, principal: Principal, write = false): Promise<Dataset> {
    const dataset = await this.repository.dataset(this.objectId(datasetId));
    if (!dataset) this.missing();
    await this.project(dataset.projectId.toHexString(), principal, write);
    return dataset;
  }
  async version(datasetId: string, versionId: string): Promise<void> {
    const version = await this.repository.version(this.objectId(datasetId),this.objectId(versionId));
    if (!version) throw new NotFoundException({ code: 'VERSION_NOT_FOUND', message: 'Không tìm thấy phiên bản đã công bố' });
  }
  async preview(datasetId: string, previewId: string): Promise<void> {
    if (!await this.repository.preview(this.objectId(datasetId),this.objectId(previewId))) this.missing();
  }
  /** BE-2/3 must call this inside EVERY mutation/publish transaction, not just in a guard. */
  async fence(principal: Principal, projectId: string | undefined, session: ClientSession): Promise<void> {
    const user = await this.repository.fenceUser(this.objectId(principal.userId),session);
    if (!user.matchedCount) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
    if (projectId) {
      const project = await this.repository.fenceProject(this.objectId(projectId),this.objectId(principal.userId),session);
      if (!project.matchedCount) throw new ConflictException({ code: 'RESOURCE_DELETING', message: 'Project không còn cho phép ghi' });
    }
    // A session can be revoked between guard and transaction, so recheck it in the write set.
    const filter = { _id: this.objectId(principal.sessionId), userId: this.objectId(principal.userId), revokedAt: null, expiresAt: { $gt: new Date() } };
    const current = await this.repository.activeSession(filter._id,filter.userId,session);
    if (!current) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
    // Force a real write even when two mutations happen in the same millisecond.
    // A no-op timestamp update would not provide a reliable conflict with logout.
    const prior = current.lastUsedAt instanceof Date ? current.lastUsedAt.getTime() : 0;
    const authSession = await this.repository.touchSession(filter._id,filter.userId,filter.expiresAt.$gt,new Date(Math.max(Date.now(),prior+1)),session);
    if (!authSession.matchedCount) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
  }
  private missing(): never { throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên' }); }
  private forbidden(): never { throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Không có quyền truy cập tài nguyên' }); }
}
