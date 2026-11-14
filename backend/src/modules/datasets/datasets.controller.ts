import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { ImportOptionsDto } from './dto/import-options.dto';
import { parseImportOptions } from './dto/import-options.dto';
import type { RowsQueryDto } from './dto/dataset-query.dto';
import { parseRowsQuery } from './dto/dataset-query.validation';

@Controller('')
export class DatasetsController {
  constructor(private readonly service: DatasetsService) {}

  @Post('projects/:projectId/datasets')
  importCsv(@Param(new DtoValidationPipe(resourceParams(['projectId']))) _params: ResourceParamsDto, @Body('importOptions', new DtoValidationPipe(parseImportOptions)) _body: ImportOptionsDto, @IdempotencyKey() _key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('importCsv');
  }

  @Get('datasets/:datasetId/versions/:versionId')
  getVersion(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('getVersion');
  }

  @Get('datasets/:datasetId/versions/:versionId/rows')
  listRows(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseRowsQuery)) _query: RowsQueryDto) {
    return this.service.pending('listRows');
  }

  @Get('datasets/:datasetId/versions/:versionId/rows/:rowId')
  getRow(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId', 'rowId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('getRow');
  }

}
