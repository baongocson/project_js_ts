import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { DatasetsRepository } from './datasets.repository';
import { OriginalStorageService } from '../../infrastructure/storage/original-storage.service';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { DatasetRecord } from '../../infrastructure/database/be2-records';
/** Recovery performs cleanup only: it never publishes or reconstructs a client operation. */
@Injectable()
export class ImportRecoveryService extends Be2Repository implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImportRecoveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private task?: Promise<void>;
  constructor(private readonly datasets: DatasetsRepository, private readonly storage: OriginalStorageService, private readonly config: ConfigService, @Optional() @InjectConnection() connection?: Connection) { super(connection); }
  onApplicationBootstrap(): void {
    if (this.config.get('DATABASE_ENABLED') !== 'true' || this.config.get('IMPORT_RECOVERY_ENABLED') === 'false') return;
    this.start(); this.timer = setInterval(() => this.start(), 60_000); this.timer.unref();
  }
  private start(): void {
    if (this.task) return;
    this.task = this.recover().catch(() => this.logger.error('Import recovery incomplete; will retry')).finally(() => { this.task = undefined; });
  }
  async recover(projectId?: string): Promise<void> {
    for await (const dataset of this.db().collection<DatasetRecord>('datasets').find({ lifecycle: 'importing', ...(projectId ? { projectId: new Types.ObjectId(projectId) } : {}) })) {
      const receiptId = dataset.originalFile.storageKey.slice(0, 24);
      if (!/^[a-f0-9]{24}$/.test(receiptId)) continue;
      try {
        const file = await this.transaction(async session => {
          const receipt = await this.db().collection('idempotencyRecords').findOne({ _id: new Types.ObjectId(receiptId), projectId: dataset.projectId }, { session });
          if (receipt?.status === 'succeeded' || (receipt?.leaseUntil instanceof Date && receipt.leaseUntil.getTime() > Date.now())) return;
          if (!await this.datasets.fenceRecovery(dataset.projectId, session)) return; // Deletion recovery owns a deleting graph.
          if (receipt) await this.db().collection('idempotencyRecords').updateOne({ _id: receipt._id, status: receipt.status, leaseToken: receipt.leaseToken }, { $set: { status: 'failed', response: null, leaseToken: null, leaseUntil: null, updatedAt: new Date() } }, { session });
          // Re-read under the same transaction/fence: a concurrent retry may have
          // replaced the dataset before this worker acquired the project write lock.
          const current = await this.datasets.byProject(dataset.projectId.toHexString(), session);
          if (!current || !current._id.equals(dataset._id)) return;
          return this.datasets.discardImport(dataset.projectId.toHexString(), session);
        });
        if (file) await this.storage.remove(file);
      } catch { this.logger.error('Import cleanup incomplete; will retry'); }
    }
    const grace = 2 * Number(this.config.get('IDEMPOTENCY_LEASE_MS') ?? 60_000);
    await this.datasets.discardOrphanCandidates(new Date(Date.now() - grace), projectId);
    for (const key of await this.storage.oldKeys(new Date(Date.now() - grace))) {
      if (await this.db().collection('datasets').findOne({ 'originalFile.storageKey': key })) continue;
      const receipt = await this.db().collection('idempotencyRecords').findOne({ _id: new Types.ObjectId(key.slice(0, 24)), status: 'pending', leaseToken: key.slice(25, -4), leaseUntil: { $gt: new Date() } });
      if (!receipt) await this.storage.remove(key);
    }
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.task; }
}
