import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { parseEmptyQuery } from '../../common/validation/query.validation';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import { HistoryService } from './history.service';
import type { HistoryQueryDto, RestoreVersionDto } from './dto/history.dto';
import { parseHistoryQuery, parseRestoreVersion } from './dto/history.validation';

@Controller('datasets/:datasetId')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('operations')
  listOperations(
    @CurrentPrincipal() principal: Principal,
    @Param(new DtoValidationPipe(resourceParams(['datasetId']))) params: ResourceParamsDto,
    @Query(new DtoValidationPipe(parseHistoryQuery)) query: HistoryQueryDto,
  ) {
    return this.service.listOperations(principal, params.datasetId!.toLowerCase(), query);
  }

  @Post('versions/:versionId/restore')
  restore(
    @CurrentPrincipal() principal: Principal,
    @Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) params: ResourceParamsDto,
    @Body(new DtoValidationPipe(parseRestoreVersion)) body: RestoreVersionDto,
    @IdempotencyKey() key: string,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>,
  ) {
    return this.service.restore(principal, params.datasetId!.toLowerCase(), params.versionId!.toLowerCase(), body, key);
  }
}
