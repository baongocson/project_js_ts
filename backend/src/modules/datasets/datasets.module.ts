import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

import { DatasetsGuard } from './datasets.guard';
import { DatasetsRepository } from './datasets.repository';

@Module({ controllers: [DatasetsController], providers: [DatasetsService, DatasetsGuard, DatasetsRepository], exports: [DatasetsService] })
export class DatasetsModule {}
