import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatasetsRepository } from './datasets.repository';
import { OriginalStorageService } from '../../infrastructure/storage/original-storage.service';
import { ImportRecoveryRepository } from './import-recovery.repository';
/** Recovery performs cleanup only: it never publishes or reconstructs a client operation. */
@Injectable()
export class ImportRecoveryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImportRecoveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private task?: Promise<void>;
  constructor(private readonly datasets: DatasetsRepository, private readonly storage: OriginalStorageService, private readonly config: ConfigService, private readonly repository:ImportRecoveryRepository) {}
  onApplicationBootstrap(): void {
    if (this.config.get('DATABASE_ENABLED') !== 'true' || this.config.get('IMPORT_RECOVERY_ENABLED') === 'false') return;
    this.start(); this.timer = setInterval(() => this.start(), 60_000); this.timer.unref();
  }
  private start(): void {
    if (this.task) return;
    this.task = this.recover().catch(() => this.logger.error('Import recovery incomplete; will retry')).finally(() => { this.task = undefined; });
  }
  async recover(projectId?: string): Promise<void> {
    for await (const dataset of this.repository.importing(projectId)) {
      const receiptId = dataset.originalFile.storageKey.slice(0, 24);
      if (!/^[a-f0-9]{24}$/.test(receiptId)) continue;
      try {
        const file = await this.repository.transaction(async session => {
          const receipt = await this.repository.receipt(receiptId,dataset.projectId,session);
          if (receipt?.status === 'succeeded' || (receipt?.leaseUntil instanceof Date && receipt.leaseUntil.getTime() > Date.now())) return;
          if (!await this.datasets.fenceRecovery(dataset.projectId, session)) return; // Deletion recovery owns a deleting graph.
          if (receipt) await this.repository.failReceipt(receipt,session);
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
      if (await this.repository.sourceReferenced(key)) continue;
      const receipt = await this.repository.activeSourceLease(key);
      if (!receipt) await this.storage.remove(key);
    }
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.task; }
}
