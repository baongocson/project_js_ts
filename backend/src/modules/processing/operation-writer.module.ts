import { Module } from '@nestjs/common';
import { OperationWriterRepository } from './operation-writer.repository';
@Module({ providers: [OperationWriterRepository], exports: [OperationWriterRepository] })
export class OperationWriterModule {}
