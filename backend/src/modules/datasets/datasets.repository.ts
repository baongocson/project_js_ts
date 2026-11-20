import { ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { Binary } from 'mongodb';
import { CODEC_VERSION, decodeSnapshot, type Column, type Snapshot } from '@dashboard/data-core';
import { Be2Repository } from '../../infrastructure/database/be2-repository';
import type { ColumnRecord, DatasetRecord, VersionRecord } from '../../infrastructure/database/be2-records';
import { sha256 } from '../../common/domain/sha256';
import { snapshotContentHash } from './snapshot-hash';
import { publicColumn } from './dataset-mappers';
import { RecoveryFenceRepository } from '../../infrastructure/database/recovery-fence.repository';
@Injectable()
export class DatasetsRepository extends Be2Repository {
  constructor(private readonly recoveryFence: RecoveryFenceRepository, @Optional() @InjectConnection() connection?: Connection) { super(connection); }
  fenceRecovery(projectId: Types.ObjectId, session: ClientSession) { return this.recoveryFence.activeProject(projectId, session); }
  async byProject(projectId: string, session?: ClientSession) { return this.db().collection<DatasetRecord>('datasets').findOne({ projectId: new Types.ObjectId(projectId) }, { session }); }
  async byId(datasetId: string, session?: ClientSession) {
    const dataset = await this.db().collection<DatasetRecord>('datasets').findOne({ _id: new Types.ObjectId(datasetId) }, { session });
    if (!dataset) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Không tìm thấy dataset' });
    return dataset;
  }
  async version(datasetId: string, versionId: string, session?: ClientSession) {
    const version = await this.db().collection<VersionRecord>('datasetVersions').findOne({ _id: new Types.ObjectId(versionId), datasetId: new Types.ObjectId(datasetId), state: 'published' }, { session });
    if (!version) throw new NotFoundException({ code: 'VERSION_NOT_FOUND', message: 'Không tìm thấy phiên bản đã công bố' });
    const columns = await this.db().collection<ColumnRecord>('versionColumns').find({ versionId: version._id }, { session }).sort({ position: 1 }).toArray();
    return { version, columns: columns.map(publicColumn) };
  }
  /** Read a staged candidate only through a verified dataset/preview owner boundary. */
  async stagedSnapshot(datasetId: string, versionId: string): Promise<Snapshot> {
    return this.snapshot(datasetId, versionId, 'staged');
  }
  async snapshot(datasetId: string, versionId: string, state: 'published' | 'staged' = 'published'): Promise<Snapshot> {
    let version: VersionRecord;
    let columns: Column[];
    if (state === 'published') ({ version, columns } = await this.version(datasetId, versionId));
    else {
      const staged = await this.db().collection<VersionRecord>('datasetVersions').findOne({ _id: new Types.ObjectId(versionId), datasetId: new Types.ObjectId(datasetId), state: 'staged' });
      if (!staged) throw new NotFoundException({ code: 'CANDIDATE_NOT_FOUND', message: 'Không tìm thấy candidate đã chuẩn bị' });
      version = staged;
      const docs = await this.db().collection<ColumnRecord>('versionColumns').find({ versionId: staged._id }).sort({ position: 1 }).toArray();
      columns = docs.map(publicColumn);
    }
    const chunks = await this.db().collection<{ _id: Types.ObjectId; chunkIndex: number; payload: Binary; byteLength: number; sha256: string; codecVersion: string }>('dataChunks').find({ versionId: version._id }).sort({ chunkIndex: 1 }).toArray();
    try {
      let size = 0;
      const payloads = chunks.map((chunk, index) => {
        const payload = new Uint8Array(chunk.payload.buffer);
        if (chunk.chunkIndex !== index || chunk.codecVersion !== CODEC_VERSION || chunk.byteLength !== payload.length || sha256(payload) !== chunk.sha256) throw new Error('Chunk integrity mismatch');
        size += payload.length;
        return payload;
      });
      if (size !== version.encodedByteSize || snapshotContentHash(columns, payloads.map(sha256)) !== version.contentHash) throw new Error('Snapshot integrity mismatch');
      const snapshot = decodeSnapshot(payloads, columns);
      if (snapshot.rows.length !== version.rowCount || columns.length !== version.columnCount) throw new Error('Snapshot counts mismatch');
      return snapshot;
    } catch { throw new ServiceUnavailableException({ code: 'SNAPSHOT_CORRUPT', message: 'Không thể xác minh toàn vẹn snapshot' }); }
  }
  async reserve(dataset: DatasetRecord, version: VersionRecord, session: ClientSession): Promise<void> {
    if (await this.byProject(dataset.projectId.toHexString(), session)) throw new ConflictException({ code: 'DATASET_ALREADY_EXISTS', message: 'Project đã có dataset' });
    await this.db().collection<DatasetRecord>('datasets').insertOne(dataset, { session });
    await this.db().collection<VersionRecord>('datasetVersions').insertOne(version, { session });
  }
  async writeColumns(versionId: Types.ObjectId, columns: Column[], session: ClientSession): Promise<void> {
    await this.db().collection<ColumnRecord>('versionColumns').insertMany(columns.map(column => ({ _id: new Types.ObjectId(), versionId, ...column })), { session });
  }
  async writeChunk(versionId: Types.ObjectId, chunkIndex: number, payload: Uint8Array, session: ClientSession): Promise<void> {
    await this.db().collection('dataChunks').insertOne({ _id: new Types.ObjectId(), versionId, chunkIndex, payload: new Binary(payload), byteLength: payload.length, sha256: sha256(payload), codecVersion: CODEC_VERSION }, { session });
  }
  async stage(versionId: Types.ObjectId, session: ClientSession): Promise<void> {
    const result = await this.db().collection<VersionRecord>('datasetVersions').updateOne({ _id: versionId, state: 'building' }, { $set: { state: 'staged' } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'VERSION_STATE_CONFLICT', message: 'Candidate không còn hợp lệ' });
  }
  async reserveCandidate(version: VersionRecord, session: ClientSession): Promise<void> {
    await this.db().collection<VersionRecord>('datasetVersions').insertOne(version, { session });
  }
  async publishCandidate(input: { datasetId: string; candidateVersionId: string; expectedCurrentVersionId: string; expectedRevision: number }, session: ClientSession): Promise<number> {
    const dataset = await this.byId(input.datasetId, session);
    if (dataset.lifecycle !== 'ready' || dataset.currentVersionId?.toHexString() !== input.expectedCurrentVersionId || dataset.revision !== input.expectedRevision) throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản dữ liệu đã thay đổi' });
    const parent = await this.db().collection<VersionRecord>('datasetVersions').findOne({ _id: dataset.currentVersionId, datasetId: dataset._id, state: 'published' }, { session });
    if (!parent?.versionNumber) throw new Error('Published parent missing');
    const versionNumber = parent.versionNumber + 1, now = new Date();
    const published = await this.db().collection<VersionRecord>('datasetVersions').updateOne({ _id: new Types.ObjectId(input.candidateVersionId), datasetId: dataset._id, parentVersionId: dataset.currentVersionId, state: 'staged', contentHash: { $ne: null } }, { $set: { state: 'published', versionNumber, publishedAt: now } }, { session });
    if (!published.matchedCount) throw new ConflictException({ code: 'VERSION_STATE_CONFLICT', message: 'Candidate không thể publish' });
    const changed = await this.db().collection<DatasetRecord>('datasets').updateOne({ _id: dataset._id, currentVersionId: dataset.currentVersionId, revision: input.expectedRevision, lifecycle: 'ready' }, { $set: { currentVersionId: new Types.ObjectId(input.candidateVersionId), updatedAt: now }, $inc: { revision: 1 } }, { session });
    if (!changed.matchedCount) throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Phiên bản dữ liệu đã thay đổi' });
    return versionNumber;
  }
  async publishImport(dataset: DatasetRecord, version: VersionRecord, session: ClientSession): Promise<void> {
    const publishedAt = new Date();
    const result = await this.db().collection<VersionRecord>('datasetVersions').updateOne({ _id: version._id, datasetId: dataset._id, state: 'staged' }, { $set: { state: 'published', versionNumber: 1, publishedAt } }, { session });
    if (!result.matchedCount) throw new ConflictException({ code: 'VERSION_STATE_CONFLICT', message: 'Candidate không còn hợp lệ' });
    const changed = await this.db().collection<DatasetRecord>('datasets').updateOne({ _id: dataset._id, lifecycle: 'importing', revision: 0, currentVersionId: null }, { $set: { lifecycle: 'ready', currentVersionId: version._id, revision: 1, updatedAt: publishedAt } }, { session });
    if (!changed.matchedCount) throw new ConflictException({ code: 'BASE_VERSION_STALE', message: 'Dataset đã thay đổi' });
  }
  /** Caller holds the import receipt lease and parent fence. Never removes published data. */
  async discardImport(projectId: string, session: ClientSession): Promise<string | undefined> {
    const dataset = await this.byProject(projectId, session);
    if (!dataset || dataset.lifecycle !== 'importing') return;
    const versions = await this.db().collection<VersionRecord>('datasetVersions').find({ datasetId: dataset._id }, { session }).toArray();
    if (versions.some(version => version.state === 'published')) throw new Error('Cannot discard published import');
    for (const version of versions) {
      await this.db().collection('dataChunks').deleteMany({ versionId: version._id }, { session });
      await this.db().collection('versionColumns').deleteMany({ versionId: version._id }, { session });
    }
    await this.db().collection('datasetVersions').deleteMany({ datasetId: dataset._id }, { session });
    await this.db().collection('datasets').deleteOne({ _id: dataset._id, lifecycle: 'importing' }, { session });
    return dataset.originalFile.storageKey;
  }
  async discardOrphanCandidates(before: Date, projectId?: string): Promise<void> {
    for await (const dataset of this.db().collection<DatasetRecord>('datasets').find({ lifecycle: 'ready', ...(projectId ? { projectId: new Types.ObjectId(projectId) } : {}) })) {
      const candidates = await this.db().collection<VersionRecord>('datasetVersions').find({ datasetId: dataset._id, state: { $in: ['building', 'staged', 'discarding'] }, createdAt: { $lt: before } }, { projection: { _id: 1 } }).toArray();
      for (const candidate of candidates) await this.transaction(async session => {
        if (!await this.fenceRecovery(dataset.projectId, session)) return;
        if (await this.db().collection('idempotencyRecords').findOne({ projectId: dataset.projectId, status: 'pending', leaseUntil: { $gt: new Date() } }, { session })) return;
        if (await this.db().collection('processingPreviews').findOne({ candidateVersionId: candidate._id }, { session })) return;
        if (await this.db().collection('processingOperations').findOne({ resultVersionId: candidate._id }, { session })) return;
        if (await this.db().collection('datasets').findOne({ currentVersionId: candidate._id }, { session })) return;
        const changed = await this.db().collection<VersionRecord>('datasetVersions').updateOne({ _id: candidate._id, state: { $in: ['building', 'staged', 'discarding'] }, createdAt: { $lt: before } }, { $set: { state: 'discarding' } }, { session });
        if (!changed.matchedCount) return;
        await this.db().collection('dataChunks').deleteMany({ versionId: candidate._id }, { session });
        await this.db().collection('versionColumns').deleteMany({ versionId: candidate._id }, { session });
        await this.db().collection<VersionRecord>('datasetVersions').deleteOne({ _id: candidate._id, state: 'discarding' }, { session });
      });
    }
  }
}
