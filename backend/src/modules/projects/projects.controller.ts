import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { ProjectNameDto, ListProjectsQueryDto } from './dto/project.dto';
import { parseProjectName, parseListProjects } from './dto/project.validation';
import type { PatchWorkspaceDto } from './dto/workspace.dto';
import { parsePatchWorkspace } from './dto/workspace.validation';
import { parseEmptyBody } from '../auth/dto/auth.validation';
import type { EmptyBodyDto } from '../auth/dto/auth.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post('')
  create(@Body(new DtoValidationPipe(parseProjectName)) _body: ProjectNameDto, @IdempotencyKey() _key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('create');
  }

  @Get('')
  list(@Query(new DtoValidationPipe(parseListProjects)) _query: ListProjectsQueryDto) {
    return this.service.pending('list');
  }

  @Get(':projectId')
  get(@Param(new DtoValidationPipe(resourceParams(['projectId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('get');
  }

  @Patch(':projectId')
  rename(@Param(new DtoValidationPipe(resourceParams(['projectId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parseProjectName)) _body: ProjectNameDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('rename');
  }

  @Patch(':projectId/workspace')
  saveWorkspace(@Param(new DtoValidationPipe(resourceParams(['projectId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parsePatchWorkspace)) _body: PatchWorkspaceDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('saveWorkspace');
  }

  @Delete(':projectId')
  delete(@Param(new DtoValidationPipe(resourceParams(['projectId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('delete');
  }

}
