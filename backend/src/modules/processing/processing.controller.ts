import { parseEmptyQuery } from '../../common/validation/query.validation';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
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
  createPreview(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parseCreatePreview)) body: CreatePreviewDto, @IdempotencyKey() key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.createPreview(principal, params.datasetId!.toLowerCase(), body, key);
  }

  @Get('previews/:previewId')
  getPreview(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId', 'previewId']))) params: ResourceParamsDto, @Query(new DtoValidationPipe(parsePreviewQuery)) query: PreviewQueryDto) {
    return this.service.getPreview(principal, params.datasetId!.toLowerCase(), params.previewId!.toLowerCase(), query);
  }

  // Do not require the preview record before the idempotency replay check.
  // ProcessingService authorizes and resolves the preview for new Apply requests.
  @Post('operations')
  apply(@CurrentPrincipal() principal: Principal, @Param(new DtoValidationPipe(resourceParams(['datasetId']))) params: ResourceParamsDto, @Body(new DtoValidationPipe(parseApplyPreview)) body: ApplyPreviewDto, @IdempotencyKey() key: string, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.apply(principal, params.datasetId!.toLowerCase(), body, key);
  }

}
