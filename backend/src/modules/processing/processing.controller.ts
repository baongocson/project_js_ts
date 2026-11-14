import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { IdempotencyKey } from '../../common/validation/idempotency-key.decorator';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { CreatePreviewDto, ApplyPreviewDto } from './dto/processing.dto';
import { parseCreatePreview, parseApplyPreview } from './dto/processing.validation';
import type { PreviewQueryDto } from './dto/preview-query.validation';
import { parsePreviewQuery } from './dto/preview-query.validation';

@Controller('datasets/:datasetId')
export class ProcessingController {
  constructor(private readonly service: ProcessingService) {}

  @Post('previews')
  createPreview(@Param(new DtoValidationPipe(resourceParams(['datasetId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parseCreatePreview)) _body: CreatePreviewDto, @IdempotencyKey() _key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('createPreview');
  }

  @Get('previews/:previewId')
  getPreview(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'previewId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parsePreviewQuery)) _query: PreviewQueryDto) {
    return this.service.pending('getPreview');
  }

  @Post('operations')
  apply(@Param(new DtoValidationPipe(resourceParams(['datasetId']))) _params: ResourceParamsDto, @Body(new DtoValidationPipe(parseApplyPreview)) _body: ApplyPreviewDto, @IdempotencyKey() _key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('apply');
  }

}
