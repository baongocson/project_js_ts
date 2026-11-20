import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, type ClientSession, type Types } from 'mongoose';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { ProcessingSummaryDto } from '../../common/dto/response.dto';
export interface CommittedOperation {
  _id: Types.ObjectId; datasetId: Types.ObjectId; actorId: Types.ObjectId;
  baseVersionId: Types.ObjectId | null; resultVersionId: Types.ObjectId;
  kind: 'import' | 'process' | 'restore'; specification: object;
  summary: ProcessingSummaryDto; idempotencyDigest: string; createdAt: Date;
}
/** Transaction participant; callers must fence and publish before writing this ledger. */
@Injectable()
export class OperationWriterRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) { super(connection); }
  async append(operation: CommittedOperation, session: ClientSession): Promise<void> {
    if (!session.inTransaction()) throw new Error('Operation ledger requires a publish transaction');
    await this.db().collection('processingOperations').insertOne(operation, { session });
  }
}
