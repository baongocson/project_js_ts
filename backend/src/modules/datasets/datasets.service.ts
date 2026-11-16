import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { DataError, encodeSnapshot, importCsv, missingKind, queryRows, type Row, type Snapshot } from '@dashboard/data-core';
import { DatasetsRepository } from './datasets.repository';
import { publicDataset } from './dataset-mappers';
import { IdempotencyService, sha256 } from '../../infrastructure/idempotency/idempotency.service';
import { OriginalStorageService } from '../../infrastructure/storage/original-storage.service';
import { StorageWriteBarrier } from '../../infrastructure/storage/storage-write-barrier.service';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';
import type { CsvUploadDto, ImportOptionsDto } from './dto/import-options.dto';
import type { DatasetRecord, VersionRecord } from '../../infrastructure/database/be2-records';
import { ProjectStateService } from '../projects/project-state.service';
import { OperationWriterService } from '../processing/operation-writer.service';
import type { RowsQueryDto } from './dto/dataset-query.dto';
import { snapshotContentHash } from './snapshot-hash';
export function publicRow(row: Row) {
  return { rowId: row.rowId, position: row.position, cells: Object.fromEntries(Object.entries(row.cells).map(([id, cell]) => {
    const kind = missingKind(cell);
    return [id, { kind: cell.kind, value: cell.value, ...(kind ? { missingKind: kind } : {}) }];
  })) };
}
@Injectable()
export class DatasetsService {
  constructor(private readonly repository: DatasetsRepository, private readonly idempotency: IdempotencyService, private readonly storage: OriginalStorageService, private readonly ownership: OwnershipService, private readonly projects: ProjectStateService, private readonly operations: OperationWriterService, private readonly storageWrites: StorageWriteBarrier) {}
  async importCsv(principal: Principal, projectId: string, options: ImportOptionsDto, key: string, file?: CsvUploadDto) {
    await this.ownership.project(projectId, principal, true);
    if (!file) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Thiếu file CSV' });
    if (file.buffer.byteLength > 16_000_000) throw new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', message: 'CSV vượt 16.000.000 byte' });
    const fileHash = sha256(file.buffer);
    const claim = await this.idempotency.claim(principal, projectId, `v1.projects.${projectId}.datasets.import`, key, { options, fileSha256: fileHash, name: file.originalname });
    if (claim.replay) return claim.body;
    const lease = claim.lease;
    return this.idempotency.run(lease, async () => {
      let snapshot: Snapshot;
      try { snapshot = importCsv(file.buffer, options, randomUUID); }
      catch (error) { this.dataError(error); }
      let chunks: Uint8Array[];
      try { chunks = encodeSnapshot(snapshot); }
      catch (error) { this.dataError(error); }
      const now = new Date(), datasetId = new Types.ObjectId(), versionId = new Types.ObjectId(), operationId = new Types.ObjectId();
      const storageKey = `${lease.id.toHexString()}-${lease.token}.csv`;
      const dataset: DatasetRecord = { _id: datasetId, projectId: new Types.ObjectId(projectId), originalFile: { name: file.originalname, byteSize: file.buffer.byteLength, sha256: fileHash, importedAt: now, storageKey }, importOptions: options, currentVersionId: null, revision: 0, lifecycle: 'importing', createdAt: now, updatedAt: now };
      const version: VersionRecord = { _id: versionId, datasetId, versionNumber: null, parentVersionId: null, restoredFromVersionId: null, state: 'building', rowCount: snapshot.rows.length, columnCount: snapshot.columns.length, encodedByteSize: chunks.reduce((size, chunk) => size + chunk.length, 0), contentHash: snapshotContentHash(snapshot.columns, chunks.map(sha256)), createdAt: now, publishedAt: null };
      const oldFile = await this.repository.transaction(async session => {
        await this.idempotency.touch(lease, session);
        const existing = await this.repository.byProject(projectId, session);
        if (existing && (existing.lifecycle !== 'importing' || !existing.originalFile.storageKey.startsWith(lease.id.toHexString() + '-'))) throw new ConflictException({ code: 'DATASET_ALREADY_EXISTS', message: 'Project đã có dataset' });
        const old = await this.repository.discardImport(projectId, session);
        await this.repository.reserve(dataset, version, session);
        return old;
      });
      if (oldFile) await this.storage.remove(oldFile);
      await this.storageWrites.track(projectId, async () => {
        // Register before checking the durable fence: deletion waits for this write,
        // or this fence refuses it. Filesystem IO stays outside Mongo transactions.
        await this.repository.transaction(session => this.idempotency.touch(lease, session));
        await this.storage.put(storageKey, file.buffer);
      });
      await this.repository.transaction(async session => { await this.idempotency.touch(lease, session); await this.repository.writeColumns(versionId, snapshot.columns, session); });
      for (let index = 0; index < chunks.length; index++) await this.repository.transaction(async session => { await this.idempotency.touch(lease, session); await this.repository.writeChunk(versionId, index, chunks[index], session); });
      await this.repository.transaction(async session => { await this.idempotency.touch(lease, session); await this.repository.stage(versionId, session); });
      if (sha256(await this.storage.read(storageKey)) !== fileHash) throw new Error('Original checksum mismatch');
      const response = { dataset: publicDataset({ ...dataset, currentVersionId: versionId, revision: 1 }), version: { _id: versionId.toHexString(), versionNumber: 1, rowCount: version.rowCount, columnCount: version.columnCount }, columns: snapshot.columns, operationId: operationId.toHexString() };
      await this.repository.transaction(async session => {
        await this.idempotency.touch(lease, session);
        await this.repository.publishImport(dataset, version, session);
        await this.projects.bindImport(projectId, versionId, session);
        await this.operations.append({ _id: operationId, datasetId, actorId: new Types.ObjectId(principal.userId), baseVersionId: null, resultVersionId: versionId, kind: 'import', specification: { importOptions: options, fileSha256: fileHash }, summary: { before: { rowCount: 0, columnCount: 0 }, after: { rowCount: version.rowCount, columnCount: version.columnCount }, insertedRowCount: version.rowCount, deletedRowCount: 0, updatedRowCount: 0, updatedCellCount: 0, addedColumnCount: version.columnCount, removedColumnCount: 0, typeChangedColumnCount: 0, metadataChangedColumnCount: 0, usedStatistics: [] }, idempotencyDigest: lease.digest, createdAt: new Date() }, session);
        await this.idempotency.complete(lease, 201, response, session);
      });
      return response;
    });
  }
  private dataError(error: unknown): never {
    if (!(error instanceof DataError)) throw error;
    throw new HttpException({ code: error.code, message: error.message, details: error.details }, ['LIMIT_EXCEEDED', 'FILE_TOO_LARGE'].includes(error.code) ? 413 : 400);
  }
  async getVersion(principal: Principal, datasetId: string, versionId: string) {
    await this.ownership.dataset(datasetId, principal);
    const { version, columns } = await this.repository.version(datasetId, versionId);
    return { version: { _id: versionId, versionNumber: version.versionNumber, state: 'published', rowCount: version.rowCount, columnCount: version.columnCount, encodedByteSize: version.encodedByteSize }, columns };
  }
  async readSnapshot(principal: Principal, datasetId: string, versionId: string) {
    await this.ownership.dataset(datasetId, principal);
    return this.repository.snapshot(datasetId, versionId);
  }
  async projectDataset(projectId: string) { return this.repository.byProject(projectId); }
  async listRows(principal: Principal, datasetId: string, versionId: string, query: RowsQueryDto) {
    const snapshot = await this.readSnapshot(principal, datasetId, versionId);
    const ids = new Set(snapshot.columns.map(column => column.columnId));
    if (query.filters.some(filter => !ids.has(filter.columnId)) || (query.sort && !ids.has(query.sort.columnId))) throw new BadRequestException({ code: 'COLUMN_NOT_FOUND', message: 'Cột không thuộc phiên bản' });
    const rows = queryRows(snapshot, query.filters, query.sort);
    return { rows: rows.slice((query.page - 1) * query.limit, query.page * query.limit).map(publicRow), page: query.page, limit: query.limit, totalRows: snapshot.rows.length, filteredRows: rows.length, totalPages: Math.ceil(rows.length / query.limit) };
  }
  async getRow(principal: Principal, datasetId: string, versionId: string, rowId: string) {
    const snapshot = await this.readSnapshot(principal, datasetId, versionId);
    const row = snapshot.rows.find(row => row.rowId === rowId);
    if (!row) throw new NotFoundException({ code: 'ROW_NOT_FOUND', message: 'Không tìm thấy dòng' });
    return { versionId, row: publicRow(row) };
  }
}
