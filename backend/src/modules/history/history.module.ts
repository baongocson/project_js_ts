import { Module } from '@nestjs/common';
import { DatasetsModule } from '../datasets/datasets.module';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { HistoryRepository } from './history.repository';

@Module({
  imports: [DatasetsModule, IdempotencyModule],
  controllers: [HistoryController],
  providers: [HistoryService, HistoryRepository],
  exports: [HistoryService],
})
export class HistoryModule {}
