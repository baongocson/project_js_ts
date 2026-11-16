import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecoveryFenceService } from '../../infrastructure/database/recovery-fence.service';
import { ProcessingRepository } from './processing.repository';

/** Retires expired preview indexes. BE-2's orphan-candidate recovery then safely
 * deletes staging chunks/columns, never a published version. */
@Injectable()
export class ProcessingRecoveryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ProcessingRecoveryService.name);
  private timer?: ReturnType<typeof setInterval>;
  private task?: Promise<void>;
  constructor(private readonly repository: ProcessingRepository, private readonly fence: RecoveryFenceService, private readonly config: ConfigService) {}
  onApplicationBootstrap(): void {
    if (this.config.get('DATABASE_ENABLED') !== 'true') return;
    this.start();
    this.timer = setInterval(() => this.start(), 60_000);
    this.timer.unref();
  }
  private start(): void {
    if (this.task) return;
    this.task = this.recover().catch(() => this.logger.error('Preview cleanup incomplete; will retry')).finally(() => { this.task = undefined; });
  }
  async recover(): Promise<void> {
    const now = new Date();
    const previews = await this.repository.expired(now, 50);
    for (const preview of previews) {
      await this.repository.transaction(async session => {
        const projectId = await this.repository.projectOfPreview(preview, session);
        if (!projectId || !await this.fence.activeProject(projectId, session)) return;
        await this.repository.purgeExpired(preview, now, session);
      });
    }
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.task; }
}
