import { Module } from '@nestjs/common';
import { DatasetsModule } from '../datasets/datasets.module';
import { AnalysisRepository } from '../analysis/analysis.repository';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './ollama.service';

@Module({ imports: [DatasetsModule], controllers: [AiController], providers: [AnalysisRepository, AiService, OllamaService] })
export class AiModule {}
