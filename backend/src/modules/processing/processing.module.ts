import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { DatasetsModule } from '../datasets/datasets.module';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { ProcessingRecoveryService } from './processing-recovery.service';
import { ProcessingService } from './processing.service';

import { ProcessingGuard } from './processing.guard';
import { ProcessingRepository } from './processing.repository';

@Module({ imports: [DatasetsModule, IdempotencyModule], controllers: [ProcessingController], providers: [ProcessingService, ProcessingGuard, ProcessingRepository, ProcessingRecoveryService], exports: [ProcessingService] })
export class ProcessingModule {}
