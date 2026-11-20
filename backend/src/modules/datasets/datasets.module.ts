import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

import { DatasetsRepository } from './datasets.repository';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { ProjectStateModule } from '../projects/project-state.module';
import { OperationWriterModule } from '../processing/operation-writer.module';
import { ImportRecoveryRepository } from './import-recovery.repository';
import { ImportRecoveryService } from './import-recovery.service';
import { SnapshotPublisherService } from './snapshot-publisher.service';

@Module({ imports: [IdempotencyModule, ProjectStateModule, OperationWriterModule, StorageModule], controllers: [DatasetsController], providers: [DatasetsService, DatasetsRepository, ImportRecoveryRepository, ImportRecoveryService, SnapshotPublisherService], exports: [DatasetsService, SnapshotPublisherService, DatasetsRepository] })
export class DatasetsModule {}
