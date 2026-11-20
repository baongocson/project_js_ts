import { IdempotencyRepository } from './idempotency.repository';
import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { RecoveryFenceRepository } from '../database/recovery-fence.repository';
@Module({ providers: [IdempotencyRepository, IdempotencyService, RecoveryFenceRepository], exports: [IdempotencyService, RecoveryFenceRepository] })
export class IdempotencyModule {}
