import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { HistoryQueryDto, RestoreVersionDto } from './dto/history.dto';
import { parseHistoryQuery, parseRestoreVersion } from './dto/history.validation';

@Controller('datasets/:datasetId')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('operations')
  listOperations(@Param(new DtoValidationPipe(resourceParams(['datasetId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseHistoryQuery)) _query: HistoryQueryDto) {
    return this.service.pending('listOperations');
  }

  @Post('versions/:versionId/restore')
  restore(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parseRestoreVersion)) _body: RestoreVersionDto, @IdempotencyKey() _key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('restore');
  }

}
