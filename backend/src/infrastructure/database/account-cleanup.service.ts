import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { realpath, unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { PROJECT_ROOT } from './database.connection';
import type { Principal } from '../../modules/auth/security/auth-context';

/** Resumable cleanup for an account already fenced as deleting. Shared with project deletion. */
@Injectable()
export class AccountCleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AccountCleanupService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sweepTask?: Promise<void>;
  private readonly active = new Map<string, Promise<void>>();
  constructor(private readonly config: ConfigService, @Optional() @InjectConnection() private readonly connection?: Connection) {}
  private db() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db;
  }
  async markUserDeleting(userId: Types.ObjectId, principal?: Principal): Promise<void> {
    this.db();
    const session = await this.connection!.startSession();
    try {
      await session.withTransaction(async () => {
        if (principal) {
          const auth = await this.db().collection('authSessions').updateOne(
            { _id: new Types.ObjectId(principal.sessionId), userId, revokedAt: null, expiresAt: { $gt: new Date() } },
            { $set: { lastUsedAt: new Date() } }, { session },
          );
          if (!auth.matchedCount) throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ' });
        }
        await this.db().collection('users').updateOne({ _id: userId, lifecycle: 'active' }, { $set: { lifecycle: 'deleting', updatedAt: new Date() }, $inc: { writeEpoch: 1 } }, { session });
        await this.db().collection('authSessions').updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
        await this.db().collection('projects').updateMany({ ownerId: userId, lifecycle: { $ne: 'deleting' } }, { $set: { lifecycle: 'deleting' }, $inc: { writeEpoch: 1 } }, { session });
      });
    } finally { await session.endSession(); }
  }
  removeUser(userId: Types.ObjectId): Promise<void> {
    const key = userId.toHexString();
    const existing = this.active.get(key);
    if (existing) return existing;
    const work = this.cleanupUser(userId).finally(() => this.active.delete(key));
    this.active.set(key, work);
    return work;
  }
  private async cleanupUser(userId: Types.ObjectId): Promise<void> {
    const user = await this.db().collection('users').findOne({ _id: userId, lifecycle: 'deleting' });
    if (!user) return;
    for await (const project of this.db().collection('projects').find({ ownerId: userId }, { projection: { _id: 1 } })) {
      await this.removeProject(project._id);
    }
    await this.db().collection('idempotencyRecords').deleteMany({ userId });
    await this.db().collection('authSessions').deleteMany({ userId });
    await this.db().collection('users').deleteOne({ _id: userId, lifecycle: 'deleting' });
  }
  /** Caller must mark/fence the project first. BE-2 can reuse this instead of another cascade. */
  async removeProject(projectId: Types.ObjectId): Promise<void> {
    const project = await this.db().collection('projects').findOne({ _id: projectId });
    if (!project) return;
    if (project.lifecycle !== 'deleting') throw new Error('Cleanup requires a deleting project');
    for await (const dataset of this.db().collection('datasets').find({ projectId })) {
      for await (const preview of this.db().collection('processingPreviews').find({ datasetId: dataset._id }, { projection: { _id: 1 } })) {
        await this.db().collection('previewChanges').deleteMany({ previewId: preview._id });
      }
      await this.db().collection('processingPreviews').deleteMany({ datasetId: dataset._id });
      for await (const version of this.db().collection('datasetVersions').find({ datasetId: dataset._id }, { projection: { _id: 1 } })) {
        await this.db().collection('dataChunks').deleteMany({ versionId: version._id });
        await this.db().collection('versionColumns').deleteMany({ versionId: version._id });
      }
      await this.db().collection('datasetVersions').deleteMany({ datasetId: dataset._id });
      await this.db().collection('processingOperations').deleteMany({ datasetId: dataset._id });
      const original: unknown = dataset.originalFile;
      if (typeof original === 'object' && original !== null && 'storageKey' in original && typeof original.storageKey === 'string') {
        await this.removeOriginal(original.storageKey);
      }
      await this.db().collection('datasets').deleteOne({ _id: dataset._id });
    }
    await this.db().collection('workspaces').deleteMany({ projectId });
    await this.db().collection('idempotencyRecords').deleteMany({ projectId });
    await this.db().collection('projects').deleteOne({ _id: projectId, lifecycle: 'deleting' });
  }
  private async removeOriginal(storageKey: string): Promise<void> {
    const root = resolve(this.config.get<string>('ORIGINAL_STORAGE_ROOT') || resolve(PROJECT_ROOT, 'backend/storage/originals'));
    const target = resolve(root, storageKey);
    const inside = (base: string, candidate: string) => {
      const rel = relative(base, candidate);
      return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
    };
    if (!inside(root, target)) throw new Error('Invalid original storage key');
    try {
      const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
      if (!inside(realRoot, realTarget)) throw new Error('Original storage path escapes root');
      await unlink(realTarget);
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  onApplicationBootstrap(): void {
    if (this.config.get('DATABASE_ENABLED') !== 'true' || this.config.get('ACCOUNT_CLEANUP_ENABLED') === 'false') return;
    this.startSweep();
    this.timer = setInterval(() => this.startSweep(), 60_000);
    this.timer.unref();
  }
  private startSweep(): void {
    if (this.sweepTask) return;
    this.sweepTask = this.sweep().catch(() => this.logger.error('Account cleanup incomplete; will retry')).finally(() => { this.sweepTask = undefined; });
  }
  private async sweep(): Promise<void> {
    for await (const user of this.db().collection('users').find({ lifecycle: 'deleting' }, { projection: { _id: 1 } })) {
      try { await this.removeUser(user._id); }
      catch { this.logger.error('Account cleanup incomplete; will retry'); }
    }
  }
  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.sweepTask;
    await Promise.allSettled(this.active.values());
  }
}
