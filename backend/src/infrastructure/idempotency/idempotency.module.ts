import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { RecoveryFenceService } from '../database/recovery-fence.service';
@Module({ providers: [IdempotencyService, RecoveryFenceService], exports: [IdempotencyService, RecoveryFenceService] })
export class IdempotencyModule {}
