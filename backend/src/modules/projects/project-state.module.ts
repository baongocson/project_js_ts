import { Module } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { ProjectStateService } from './project-state.service';
@Module({ providers: [ProjectsRepository, ProjectStateService], exports: [ProjectsRepository, ProjectStateService] })
export class ProjectStateModule {}
