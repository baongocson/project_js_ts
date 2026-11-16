import { Types, type Connection } from 'mongoose';
import { Binary } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** All fixtures are linked to this test's user, never shared application data. */
export async function ownedFixture(connection: Connection, userId: Types.ObjectId, storageRoot: string) {
  const id = () => new Types.ObjectId();
  const projectId = id(), datasetId = id(), versionId = id(), previewId = id();
  const now = new Date(), expiresAt = new Date(now.getTime() + 3_600_000);
  const payload = Buffer.from('a\n');
  const hash = createHash('sha256').update(payload).digest('hex');
  const storageKey = `be1-${randomUUID()}.csv`;
  await mkdir(storageRoot, { recursive: true });
  await writeFile(resolve(storageRoot, storageKey), payload);
  const count = { rowCount: 0, columnCount: 1 };
  const summary = { before: count, after: count, insertedRowCount: 0, deletedRowCount: 0, updatedRowCount: 0, updatedCellCount: 0, addedColumnCount: 0, removedColumnCount: 0, typeChangedColumnCount: 0, metadataChangedColumnCount: 0, usedStatistics: [] };
  const importOptions = { encoding: 'utf-8', delimiter: ',', headerPolicy: 'first-row', missingPolicy: 'default-v1' };
  const specification = { method: 'uppercase', parameters: {}, scope: { type: 'dataset' }, statisticsScope: { type: 'whole-columns' }, engineVersion: 'test-v1' };
  const documents: Record<string, Record<string, unknown> & { _id: Types.ObjectId }> = {
    projects: { _id: projectId, ownerId: userId, name: 'BE1 cascade fixture', lifecycle: 'ready', writeEpoch: 0, createdAt: now, updatedAt: now },
    workspaces: { _id: id(), projectId, boundVersionId: versionId, revision: 1, activeTab: 'collection', chartConfig: { xColumnId: null, yColumnId: null, zColumnId: null, colorMode: 'normal', outlierColumnIds: [], outlierMethod: 'iqr', threshold: 1.5 }, selection: { columnIds: [], cell: null }, tableState: { filters: [], sort: null, page: 1, pageSize: 10 }, updatedAt: now },
    datasets: { _id: datasetId, projectId, originalFile: { name: 'a.csv', byteSize: payload.length, sha256: hash, importedAt: now, storageKey }, importOptions, currentVersionId: versionId, revision: 1, lifecycle: 'ready', createdAt: now, updatedAt: now },
    datasetVersions: { _id: versionId, datasetId, versionNumber: 1, parentVersionId: null, restoredFromVersionId: null, state: 'published', rowCount: 0, columnCount: 1, encodedByteSize: payload.length, contentHash: hash, createdAt: now, publishedAt: now },
    versionColumns: { _id: id(), versionId, columnId: randomUUID(), name: 'a', position: 0, logicalType: 'text', format: null, lineage: null },
    dataChunks: { _id: id(), versionId, chunkIndex: 0, payload: new Binary(payload), byteLength: payload.length, sha256: hash, codecVersion: 'test-v1' },
    processingPreviews: { _id: previewId, datasetId, baseVersionId: versionId, baseRevision: 1, candidateVersionId: null, specification, specHash: hash, status: 'ready', summary, schemaChanges: { added: [], removed: [], modified: [] }, diagnostics: { errorCount: 0, warningCount: 0, errors: [], warnings: [], truncated: false }, createdAt: now, expiresAt },
    previewChanges: { _id: id(), previewId, rowId: randomUUID(), ordinal: 0, changeKind: 'updated', beforePosition: 0, afterPosition: 0 },
    processingOperations: { _id: id(), datasetId, actorId: userId, baseVersionId: null, resultVersionId: versionId, kind: 'import', specification: { importOptions, fileSha256: hash }, summary, idempotencyDigest: hash, createdAt: now },
    idempotencyRecords: { _id: id(), userId, projectId, actionScope: 'v1.projects.create', keyDigest: hash, requestHash: hash, status: 'pending', response: null, leaseUntil: expiresAt, leaseToken: randomUUID(), createdAt: now, updatedAt: now },
  };
  for (const [collection, document] of Object.entries(documents)) await connection.db!.collection(collection).insertOne(document);
  return { documents, projectId, datasetId, versionId, previewId, sourcePath: resolve(storageRoot, storageKey) };
}
