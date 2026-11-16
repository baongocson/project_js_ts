import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { SummaryQueryDto, DistributionQueryDto, CorrelationQueryDto, Points3dQueryDto, ValueCountsQueryDto } from './dto/analysis-query.dto';
import { parseSummaryQuery, parseDistributionQuery, parseCorrelationQuery, parsePoints3dQuery, parseValueCountsQuery } from './dto/analysis-query.validation';

@Controller('datasets/:datasetId/versions/:versionId/analysis')
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Get('summary')
  summary(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseSummaryQuery)) _query: SummaryQueryDto) {
    return this.service.pending('summary');
  }

  @Get('columns/:columnId/distribution')
  distribution(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId', 'columnId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseDistributionQuery)) _query: DistributionQueryDto) {
    return this.service.pending('distribution');
  }

  @Get('correlation')
  correlation(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseCorrelationQuery)) _query: CorrelationQueryDto) {
    return this.service.pending('correlation');
  }

  @Get('points-3d')
  points3d(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parsePoints3dQuery)) _query: Points3dQueryDto) {
    return this.service.pending('points3d');
  }

  @Get('columns/:columnId/value-counts')
  valueCounts(@Param(new DtoValidationPipe(resourceParams(['datasetId', 'versionId', 'columnId']))) _params: ResourceParamsDto, @Query(new DtoValidationPipe(parseValueCountsQuery)) _query: ValueCountsQueryDto) {
    return this.service.pending('valueCounts');
  }

}
