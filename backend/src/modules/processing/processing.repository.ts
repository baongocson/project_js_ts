import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { DiagnosticsDto, ProcessingSummaryDto, SchemaChangesDto } from '../../common/dto/response.dto';
import type { RowChange } from './preview-projection';
import type { ProcessingSpecificationDto } from './dto/processing.dto';

export interface PreviewRecord {
  _id: Types.ObjectId; datasetId: Types.ObjectId; baseVersionId: Types.ObjectId; baseRevision: number;
  candidateVersionId: Types.ObjectId | null;
  specification: ProcessingSpecificationDto & { engineVersion: string }; specHash: string;
  status: 'building' | 'ready' | 'invalid' | 'applied' | 'expired';
  summary: ProcessingSummaryDto; schemaChanges: SchemaChangesDto; diagnostics: DiagnosticsDto;
  createdAt: Date; expiresAt: Date;
}

@Injectable()
export class ProcessingRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) { super(connection); }
  async insert(preview: PreviewRecord, session: ClientSession): Promise<void> {
    await this.db().collection<PreviewRecord>('processingPreviews').insertOne(preview, { session });
  }
  async insertChanges(previewId: Types.ObjectId, changes: RowChange[], session: ClientSession): Promise<void> {
    if (!changes.length) return;
    await this.db().collection('previewChanges').insertMany(changes.map(change => ({ _id: new Types.ObjectId(), previewId, ...change })), { session });
  }
  async ready(previewId: Types.ObjectId, status: 'ready' | 'invalid', session: ClientSession): Promise<void> {
    const result = await this.db().collection<PreviewRecord>('processingPreviews').updateOne({ _id: previewId, status: 'building' }, { $set: { status } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'PREVIEW_STATE_CONFLICT', message: 'Preview không thể hoàn tất' });
  }
  async get(datasetId: string, previewId: string): Promise<PreviewRecord> {
    const preview = await this.db().collection<PreviewRecord>('processingPreviews').findOne({ _id: new Types.ObjectId(previewId), datasetId: new Types.ObjectId(datasetId) });
    if (!preview) throw new NotFoundException({ code: 'PREVIEW_NOT_FOUND', message: 'Không tìm thấy preview' });
    return preview;
  }
  async listChanges(previewId: Types.ObjectId, page: number, limit: number): Promise<{ items: RowChange[]; total: number }> {
    const collection = this.db().collection<RowChange & { previewId: Types.ObjectId }>('previewChanges');
    const [items, total] = await Promise.all([
      collection.find({ previewId }).sort({ ordinal: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments({ previewId }),
    ]);
    return { items, total };
  }
  async expired(now: Date, limit: number): Promise<PreviewRecord[]> {
    return this.db().collection<PreviewRecord>('processingPreviews').find({ expiresAt: { $lte: now } }).sort({ expiresAt: 1 }).limit(limit).toArray();
  }
  async projectOfPreview(preview: PreviewRecord, session: ClientSession): Promise<Types.ObjectId | undefined> {
    const dataset = await this.db().collection<{ _id: Types.ObjectId; projectId: Types.ObjectId }>('datasets').findOne({ _id: preview.datasetId }, { session });
    return dataset?.projectId;
  }
  async purgeExpired(preview: PreviewRecord, now: Date, session: ClientSession): Promise<void> {
    const collection = this.db().collection<PreviewRecord>('processingPreviews');
    const current = await collection.findOne({ _id: preview._id, expiresAt: { $lte: now } }, { session });
    if (!current) return;
    // Don't remove an in-flight preview while its worker still owns a live lease.
    if (current.status === 'building') {
      const dataset = await this.db().collection<{ projectId: Types.ObjectId }>('datasets').findOne({ _id: current.datasetId }, { session });
      if (!dataset) return;
      const active = await this.db().collection('idempotencyRecords').findOne({ projectId: dataset.projectId, actionScope: `v1.datasets.${current.datasetId.toHexString()}.previews.create`, status: 'pending', leaseUntil: { $gt: now } }, { session });
      if (active) return;
    }
    // Same transaction as deleting preview. Apply's status CAS / expiry check races safely.
    await this.db().collection('previewChanges').deleteMany({ previewId: preview._id }, { session });
    await collection.deleteOne({ _id: preview._id, expiresAt: { $lte: now } }, { session });
  }
  async markApplied(preview: PreviewRecord, session: ClientSession): Promise<void> {
    const result = await this.db().collection<PreviewRecord>('processingPreviews').updateOne({
      _id: preview._id, datasetId: preview.datasetId, baseVersionId: preview.baseVersionId,
      candidateVersionId: preview.candidateVersionId, status: 'ready', expiresAt: { $gt: new Date() },
    }, { $set: { status: 'applied' } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'PREVIEW_ALREADY_APPLIED_OR_EXPIRED', message: 'Preview không còn có thể áp dụng' });
  }
}
