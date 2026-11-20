import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { CommittedOperation } from '../processing/operation-writer.repository';
import type { HistoryQueryDto } from './dto/history.dto';

/** Read-only history boundary; never exposes another dataset's ledger. */
@Injectable()
export class HistoryRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) { super(connection); }

  async list(datasetId: string, query: HistoryQueryDto): Promise<{ items: CommittedOperation[]; total: number }> {
    const filter = { datasetId: new Types.ObjectId(datasetId), ...(query.kind ? { kind: query.kind } : {}) };
    const collection = this.db().collection<CommittedOperation>('processingOperations');
    const [items, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return { items, total };
  }
}
