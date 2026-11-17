import { Injectable } from '@nestjs/common';
import type { ClientSession, Types } from 'mongoose';
import { ProjectsRepository } from './projects.repository';
/** Public transaction participant, keeping writes to projects/workspaces in Projects. */
@Injectable()
export class ProjectStateService {
  constructor(private readonly repository: ProjectsRepository) {}
  bindImport(projectId: string, versionId: Types.ObjectId, session: ClientSession) { return this.repository.bindImport(projectId, versionId, session); }
}
