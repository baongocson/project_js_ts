import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, UseInterceptors } from '@nestjs/common';
import { Be2RequestLogInterceptor } from '../../common/interceptors/be2-request-log.interceptor';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { ProjectsService } from './projects.service';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { ProjectNameDto, ListProjectsQueryDto } from './dto/project.dto';
import { parseProjectName, parseListProjects } from './dto/project.validation';
import type { PatchWorkspaceDto } from './dto/workspace.dto';
import { parsePatchWorkspace } from './dto/workspace.validation';
import { parseEmptyBody } from '../auth/dto/auth.validation';
import type { EmptyBodyDto } from '../auth/dto/auth.dto';

@Controller('projects')
@UseInterceptors(Be2RequestLogInterceptor)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post('')
  create(@CurrentPrincipal() principal: Principal, @Body(new DtoValidationPipe(parseProjectName)) body: ProjectNameDto, @IdempotencyKey() key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.create(principal, body, key);
  }

  @Get('')
  list(@CurrentPrincipal() principal: Principal, @Query(new DtoValidationPipe(parseListProjects)) query: ListProjectsQueryDto) {
    return this.service.list(principal, query);
  }

  @Get(':projectId')
  get(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['projectId']))) params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.get(principal, params.projectId!);
  }

  @Patch(':projectId')
  rename(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['projectId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parseProjectName)) body: ProjectNameDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.rename(principal, params.projectId!, body);
  }

  @Patch(':projectId/workspace')
  saveWorkspace(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['projectId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parsePatchWorkspace)) body: PatchWorkspaceDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.saveWorkspace(principal, params.projectId!, body);
  }

  @Delete(':projectId')
  @HttpCode(204)
  delete(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['projectId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.delete(principal, params.projectId!);
  }

}
