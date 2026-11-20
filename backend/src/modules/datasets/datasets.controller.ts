import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CsvUploadInterceptor } from './interceptors/csv-upload.interceptor';
import { Be2RequestLogInterceptor } from '../../common/interceptors/be2-request-log.interceptor';
import { InputValidator } from '../../common/validation/validation';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import type { CsvUploadDto } from './dto/import-options.dto';
import { DatasetsService } from './datasets.service';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { ImportOptionsDto } from './dto/import-options.dto';
import { parseImportOptions } from './dto/import-options.dto';
import type { RowsQueryDto } from './dto/dataset-query.dto';
import { parseRowsQuery } from './dto/dataset-query.validation';
function parseMultipart(input: unknown): ImportOptionsDto {
  const validator = new InputValidator();
  const body = validator.object(input ?? {}, '', ['importOptions']);
  validator.finish(body);
  return parseImportOptions(body.importOptions);
}

@Controller('')
@UseInterceptors(Be2RequestLogInterceptor)
export class DatasetsController {
  constructor(private readonly service: DatasetsService) {}

  @Post('projects/:projectId/datasets')
  @UseInterceptors(CsvUploadInterceptor)
  importCsv(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['projectId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parseMultipart)) body: ImportOptionsDto, @IdempotencyKey() key: string, @UploadedFile() file: CsvUploadDto | undefined, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.importCsv(principal, params.projectId!, body, key, file);
  }

  @Get('datasets/:datasetId/versions/:versionId')
  getVersion(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.getVersion(principal, params.datasetId!, params.versionId!);
  }

  @Get('datasets/:datasetId/versions/:versionId/rows')
  listRows(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) params: ResourceParamsDto, @Query(new DtoValidationPipe(parseRowsQuery)) query: RowsQueryDto) {
    return this.service.listRows(principal, params.datasetId!, params.versionId!, query);
  }

  @Get('datasets/:datasetId/versions/:versionId/rows/:rowId')
  getRow(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId', 'rowId']))) params: ResourceParamsDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.getRow(principal, params.datasetId!, params.versionId!, params.rowId!);
  }

}
