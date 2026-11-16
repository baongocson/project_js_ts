import { Module } from '@nestjs/common';
import { DatasetsModule } from '../datasets/datasets.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRepository } from './analysis.repository';

@Module({ imports: [DatasetsModule], controllers: [AnalysisController], providers: [AnalysisService, AnalysisRepository], exports: [AnalysisService] })
export class AnalysisModule {}
