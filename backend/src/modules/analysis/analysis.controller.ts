import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { AnalysisService } from './analysis.service';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { SummaryQueryDto, DistributionQueryDto, CorrelationQueryDto, Points3dQueryDto, ValueCountsQueryDto } from './dto/analysis-query.dto';
import { parseSummaryQuery, parseDistributionQuery, parseCorrelationQuery, parsePoints3dQuery, parseValueCountsQuery } from './dto/analysis-query.validation';

@Controller('datasets/:datasetId/versions/:versionId/analysis')
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}
  @Get('summary')
  summary(@CurrentPrincipal() principal:Principal,@Param(new DtoValidationPipe(resourceParams(['datasetId','versionId']))) params:ResourceParamsDto,@Query(new DtoValidationPipe(parseSummaryQuery)) query:SummaryQueryDto) {
    return this.service.summary(principal,params.datasetId!.toLowerCase(),params.versionId!.toLowerCase(),query);
  }
  @Get('columns/:columnId/distribution')
  distribution(@CurrentPrincipal() principal:Principal,@Param(new DtoValidationPipe(resourceParams(['datasetId','versionId','columnId']))) params:ResourceParamsDto,@Query(new DtoValidationPipe(parseDistributionQuery)) query:DistributionQueryDto) {
    return this.service.distribution(principal,params.datasetId!.toLowerCase(),params.versionId!.toLowerCase(),params.columnId!,query);
  }
  @Get('correlation')
  correlation(@CurrentPrincipal() principal:Principal,@Param(new DtoValidationPipe(resourceParams(['datasetId','versionId']))) params:ResourceParamsDto,@Query(new DtoValidationPipe(parseCorrelationQuery)) query:CorrelationQueryDto) {
    return this.service.correlation(principal,params.datasetId!.toLowerCase(),params.versionId!.toLowerCase(),query);
  }
  @Get('points-3d')
  points3d(@CurrentPrincipal() principal:Principal,@Param(new DtoValidationPipe(resourceParams(['datasetId','versionId']))) params:ResourceParamsDto,@Query(new DtoValidationPipe(parsePoints3dQuery)) query:Points3dQueryDto) {
    return this.service.points3d(principal,params.datasetId!.toLowerCase(),params.versionId!.toLowerCase(),query);
  }
  @Get('columns/:columnId/value-counts')
  valueCounts(@CurrentPrincipal() principal:Principal,@Param(new DtoValidationPipe(resourceParams(['datasetId','versionId','columnId']))) params:ResourceParamsDto,@Query(new DtoValidationPipe(parseValueCountsQuery)) query:ValueCountsQueryDto) {
    return this.service.valueCounts(principal,params.datasetId!.toLowerCase(),params.versionId!.toLowerCase(),params.columnId!,query);
  }
}
