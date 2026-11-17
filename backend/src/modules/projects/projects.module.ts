import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { ProjectStateModule } from './project-state.module';
import { DatasetsModule } from '../datasets/datasets.module';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AccountCleanupModule } from '../../infrastructure/database/account-cleanup.module';

@Module({ imports: [ProjectStateModule, DatasetsModule, IdempotencyModule, AccountCleanupModule], controllers: [ProjectsController], providers: [ProjectsService], exports: [ProjectsService] })
export class ProjectsModule {}
