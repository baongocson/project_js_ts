import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

import { HistoryGuard } from './history.guard';
import { HistoryRepository } from './history.repository';

@Module({ controllers: [HistoryController], providers: [HistoryService, HistoryGuard, HistoryRepository], exports: [HistoryService] })
export class HistoryModule {}
