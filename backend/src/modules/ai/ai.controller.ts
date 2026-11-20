import { Body, Controller, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import { parseSuggestionRequest, type SuggestionRequest } from './ai.contract';
import { AiService } from './ai.service';
import { parseEmptyQuery } from '../../common/validation/query.validation';

@Controller('datasets/:datasetId/versions/:versionId/ai')
export class AiController {
  constructor(private readonly service: AiService) {}
  @Post('suggestions')
  async suggest(@CurrentPrincipal() principal: Principal,
    @Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) params: ResourceParamsDto,
    @Body(new DtoValidationPipe(parseSuggestionRequest)) body: SuggestionRequest,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>, @Req() request: Request) {
    const abort = new AbortController();
    const response = request.res;
    const onClose = () => { if (!response?.writableEnded) abort.abort(); };
    response?.once('close', onClose);
    try { return await this.service.suggest(principal, params.datasetId!.toLowerCase(), params.versionId!.toLowerCase(), body, abort.signal); }
    finally { response?.off('close', onClose); }
  }
}
