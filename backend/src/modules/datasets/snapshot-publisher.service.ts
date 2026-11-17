import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { Types, type ClientSession } from 'mongoose';
import { DataError, encodeSnapshot, type Snapshot } from '@dashboard/data-core';
import { DatasetsRepository } from './datasets.repository';
import { IdempotencyService, sha256, type Lease } from '../../infrastructure/idempotency/idempotency.service';
import type { VersionRecord } from '../../infrastructure/database/be2-records';
import type { ProcessingSummaryDto } from '../../common/dto/response.dto';
import { OperationWriterService } from '../processing/operation-writer.service';
import { OwnershipService } from '../auth/security/ownership.service';
import { snapshotContentHash } from './snapshot-hash';
export interface PublishInput {
  datasetId: string; candidateVersionId: string; expectedCurrentVersionId: string; expectedRevision: number;
  kind: 'process' | 'restore'; specification: object; summary: ProcessingSummaryDto;
}
/** Internal BE-3 boundary; no HTTP route, algorithms or preview lifecycle decisions. */
@Injectable()
export class SnapshotPublisherService {
  constructor(private readonly datasets: DatasetsRepository, private readonly receipts: IdempotencyService, private readonly operations: OperationWriterService, private readonly ownership: OwnershipService) {}
  private async checkLeaseParent(lease: Lease, datasetId: string): Promise<void> {
    const dataset = await this.ownership.dataset(datasetId, lease.principal, true);
    if (dataset.projectId.toHexString() !== lease.projectId) throw new Error('Lease must be scoped to the dataset project');
  }
  async prepare(lease: Lease, datasetId: string, baseVersionId: string, snapshot: Snapshot, restoredFromVersionId: string | null = null): Promise<string> {
    await this.checkLeaseParent(lease, datasetId);
    await this.ownership.version(datasetId, baseVersionId);
    if (restoredFromVersionId) await this.ownership.version(datasetId, restoredFromVersionId);
    let chunks: Uint8Array[];
    try { chunks = encodeSnapshot(snapshot); }
    catch (error) {
      if (!(error instanceof DataError)) throw error;
      throw new HttpException({ code: error.code, message: error.message, details: error.details }, error.code === 'LIMIT_EXCEEDED' ? 413 : 400);
    }
    const id = new Types.ObjectId();
    const version: VersionRecord = { _id: id, datasetId: new Types.ObjectId(datasetId), state: 'building', parentVersionId: new Types.ObjectId(baseVersionId), restoredFromVersionId: restoredFromVersionId ? new Types.ObjectId(restoredFromVersionId) : null, versionNumber: null, rowCount: snapshot.rows.length, columnCount: snapshot.columns.length, encodedByteSize: chunks.reduce((sum, chunk) => sum + chunk.length, 0), contentHash: snapshotContentHash(snapshot.columns, chunks.map(sha256)), createdAt: new Date(), publishedAt: null };
    await this.datasets.transaction(async session => { await this.receipts.touch(lease, session); await this.datasets.reserveCandidate(version, session); });
    await this.datasets.transaction(async session => { await this.receipts.touch(lease, session); await this.datasets.writeColumns(id, snapshot.columns, session); });
    for (let index = 0; index < chunks.length; index++) await this.datasets.transaction(async session => { await this.receipts.touch(lease, session); await this.datasets.writeChunk(id, index, chunks[index], session); });
    await this.datasets.transaction(async session => { await this.receipts.touch(lease, session); await this.datasets.stage(id, session); });
    return id.toHexString();
  }
  /** BE-3 supplies an atomic preview CAS hook; a failed hook rolls back the whole publish. */
  async publish<T>(lease: Lease, input: PublishInput, response: (versionNumber: number, operationId: string, createdAt: Date) => T, participant: (session: ClientSession) => Promise<void>): Promise<T> {
    await this.checkLeaseParent(lease, input.datasetId);
    if (input.candidateVersionId === input.expectedCurrentVersionId) throw new ConflictException({ code: 'NO_CHANGES_TO_APPLY', message: 'Không có candidate mới' });
    const operationId = new Types.ObjectId(), createdAt = new Date();
    return this.datasets.transaction(async session => {
      await this.receipts.touch(lease, session);
      const versionNumber = await this.datasets.publishCandidate(input, session);
      await participant(session);
      await this.operations.append({ _id: operationId, datasetId: new Types.ObjectId(input.datasetId), actorId: new Types.ObjectId(lease.principal.userId), baseVersionId: new Types.ObjectId(input.expectedCurrentVersionId), resultVersionId: new Types.ObjectId(input.candidateVersionId), kind: input.kind, specification: input.specification, summary: input.summary, idempotencyDigest: lease.digest, createdAt }, session);
      const body = response(versionNumber, operationId.toHexString(), createdAt);
      await this.receipts.complete(lease, 201, body, session);
      return body;
    });
  }
}
