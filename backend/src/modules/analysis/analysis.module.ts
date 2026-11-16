import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

import { AnalysisGuard } from './analysis.guard';
import { AnalysisRepository } from './analysis.repository';

@Module({ controllers: [AnalysisController], providers: [AnalysisService, AnalysisGuard, AnalysisRepository], exports: [AnalysisService] })
export class AnalysisModule {}
