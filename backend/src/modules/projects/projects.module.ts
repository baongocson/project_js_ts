import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { ProjectsGuard } from './projects.guard';
import { ProjectsRepository } from './projects.repository';

@Module({ controllers: [ProjectsController], providers: [ProjectsService, ProjectsGuard, ProjectsRepository], exports: [ProjectsService] })
export class ProjectsModule {}
