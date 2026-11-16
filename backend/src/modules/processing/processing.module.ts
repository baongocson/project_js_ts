import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';

import { ProcessingGuard } from './processing.guard';
import { ProcessingRepository } from './processing.repository';

@Module({ controllers: [ProcessingController], providers: [ProcessingService, ProcessingGuard, ProcessingRepository], exports: [ProcessingService] })
export class ProcessingModule {}
