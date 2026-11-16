import { Module } from '@nestjs/common';
import { OperationWriterService } from './operation-writer.service';
@Module({ providers: [OperationWriterService], exports: [OperationWriterService] })
export class OperationWriterModule {}
