import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { realpath, unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { PROJECT_ROOT } from './database.connection';
import type { Principal } from '../../modules/auth/security/auth-context';
import { AccountCleanupRepository } from './account-cleanup.repository';
import { StorageWriteBarrier } from '../storage/storage-write-barrier.service';

/** Resumable cleanup for an account already fenced as deleting. Shared with project deletion. */
@Injectable()
export class AccountCleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AccountCleanupService.name);
  private timer?: ReturnType<typeof setInterval>;
  private sweepTask?: Promise<void>;
  private readonly active = new Map<string, Promise<void>>();
  constructor(private readonly config:ConfigService,private readonly repository:AccountCleanupRepository,@Optional() private readonly storageWrites?:StorageWriteBarrier) {}
  markUserDeleting(userId:Types.ObjectId,principal?:Principal){return this.repository.markUserDeleting(userId,principal);}
  removeUser(userId: Types.ObjectId): Promise<void> {
    const key = userId.toHexString();
    const existing = this.active.get(key);
    if (existing) return existing;
    const work = this.cleanupUser(userId).finally(() => this.active.delete(key));
    this.active.set(key, work);
    return work;
  }
  private async cleanupUser(userId: Types.ObjectId): Promise<void> {
    const user = await this.repository.deletingUser(userId);
    if (!user) return;
    for await (const project of this.repository.userProjects(userId)) {
      await this.removeProject(project._id);
    }
    await this.repository.removeUserRecords(userId);
  }
  /** Caller must mark/fence the project first. BE-2 can reuse this instead of another cascade. */
  async removeProject(projectId: Types.ObjectId): Promise<void> {
    const project = await this.repository.project(projectId);
    if (!project) return;
    if (project.lifecycle !== 'deleting') throw new Error('Cleanup requires a deleting project');
    await this.storageWrites?.wait(projectId.toHexString());
    for await (const dataset of this.repository.datasets(projectId)) {
      await this.repository.removeDatasetContents(dataset._id);
      const original: unknown = dataset.originalFile;
      if (typeof original === 'object' && original !== null && 'storageKey' in original && typeof original.storageKey === 'string') {
        await this.removeOriginal(original.storageKey);
      }
      await this.repository.removeDataset(dataset._id);
    }
    await this.repository.removeProjectRecords(projectId);
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
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error;
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
    for await (const user of this.repository.deletingUsers()) {
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
