const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { Types } = require('mongoose');
const { openDatabase } = require('../dist/infrastructure/database/database.connection');
const { COLLECTION_CONTRACTS } = require('../dist/infrastructure/database/collection-contracts');
const { verifyDatabase } = require('../dist/infrastructure/database/database.provision');
let connection;
const id = () => new Types.ObjectId();
const hash = 'a'.repeat(64);
const now = new Date();
const expires = new Date(Date.now() + 3600000);
const columnId = randomUUID(), rowId = randomUUID();
const userId = id(), projectId = id(), datasetId = id(), versionId = id(), previewId = id();
const column = { columnId, name: '', position: 0, logicalType: 'text', format: null, lineage: null };
const count = { rowCount: 0, columnCount: 1 };
const summary = { before: count, after: count, insertedRowCount: 0, deletedRowCount: 0, updatedRowCount: 0, updatedCellCount: 0, addedColumnCount: 0, removedColumnCount: 0, typeChangedColumnCount: 0, metadataChangedColumnCount: 0, usedStatistics: [] };
const specification = { method: 'uppercase', parameters: {}, scope: { type: 'dataset' }, statisticsScope: { type: 'whole-columns' }, engineVersion: 'test-v1' };
const importOptions = { encoding: 'utf-8', delimiter: ',', headerPolicy: 'first-row', missingPolicy: 'default-v1' };
const payload = Buffer.from('typed snapshot ✓');
const fixtures = {
  users: { _id: userId, email: `db-${randomUUID()}@example.com`, passwordHash: 'test-only-not-a-real-password', displayName: null, preferences: { theme: 'system' }, lifecycle: 'active', writeEpoch: 0, createdAt: now, updatedAt: now },
  authSessions: { userId, refreshTokenHash: randomUUID(), rotationCounter: 0, expiresAt: expires, revokedAt: null, createdAt: now, lastUsedAt: now },
  projects: { _id: projectId, ownerId: userId, name: 'Đồ thị thử nghiệm', lifecycle: 'empty', writeEpoch: 0, createdAt: now, updatedAt: now },
  workspaces: { projectId, boundVersionId: null, revision: 0, activeTab: 'collection', chartConfig: { xColumnId: null, yColumnId: null, zColumnId: null, colorMode: 'normal', outlierColumnIds: [], outlierMethod: 'iqr', threshold: 1.5 }, selection: { columnIds: [], cell: null }, tableState: { filters: [], sort: null, page: 1, pageSize: 10 }, updatedAt: now },
  datasets: { _id: datasetId, projectId, originalFile: { name: 'header-only.csv', byteSize: 5, sha256: hash, importedAt: now, storageKey: 'test/private-original.csv' }, importOptions, currentVersionId: null, revision: 0, lifecycle: 'importing', createdAt: now, updatedAt: now },
  datasetVersions: { _id: versionId, datasetId, versionNumber: 1, parentVersionId: null, restoredFromVersionId: null, state: 'published', rowCount: 0, columnCount: 1, encodedByteSize: payload.length, contentHash: hash, createdAt: now, publishedAt: now },
  versionColumns: { versionId, ...column },
  dataChunks: { versionId, chunkIndex: 0, payload, byteLength: payload.length, sha256: createHash('sha256').update(payload).digest('hex'), codecVersion: 'test-v1' },
  processingPreviews: { _id: previewId, datasetId, baseVersionId: versionId, baseRevision: 0, candidateVersionId: id(), specification, specHash: hash, status: 'ready', summary, schemaChanges: { added: [], removed: [], modified: [] }, diagnostics: { errorCount: 0, warningCount: 0, errors: [], warnings: [], truncated: false }, createdAt: now, expiresAt: expires },
  previewChanges: { previewId, rowId, ordinal: 0, changeKind: 'updated', beforePosition: 0, afterPosition: 0 },
  processingOperations: { datasetId, actorId: userId, baseVersionId: null, resultVersionId: versionId, kind: 'import', specification: { importOptions, fileSha256: hash }, summary, idempotencyDigest: hash, createdAt: now },
  idempotencyRecords: { userId, projectId, actionScope: 'v1.projects.create', keyDigest: hash, requestHash: hash, status: 'pending', response: null, leaseUntil: expires, leaseToken: randomUUID(), createdAt: now, updatedAt: now },
};
fixtures.users.emailNormalized = fixtures.users.email;
before(async () => { connection = await openDatabase(); await verifyDatabase(connection); });
after(async () => { await connection?.close(); });

async function rollback(work) {
  const session = await connection.startSession();
  session.startTransaction();
  try { await work(session); } finally { if (session.inTransaction()) await session.abortTransaction(); await session.endSession(); }
}
function fresh(name, patch = {}) { return { ...fixtures[name], _id: id(), ...patch }; }
async function rejectWrite(name, document, code = 121) {
  await rollback(async session => { await assert.rejects(connection.db.collection(name).insertOne(document, { session }), e => e.code === code); });
}

test('Atlas: round-trip all 12 collections through Mongoose, BSON types and transaction rollback', async t => {
  const inserted = [];
  await rollback(async session => {
    for (const c of COLLECTION_CONTRACTS) await t.test(c.name, async () => {
      const model = connection.model(c.name, c.schema, c.name);
      const [saved] = await model.create([fixtures[c.name]], { session });
      inserted.push([c.name, saved._id]);
      const result = await model.findById(saved._id).session(session).lean();
      assert.ok(result);
      assert.ok(result._id instanceof Types.ObjectId);
      if (result.createdAt) assert.ok(result.createdAt instanceof Date);
      assert.equal(result.__v, undefined);
      if (c.name === 'dataChunks') assert.deepEqual(Buffer.from(result.payload.buffer), payload);
      if (c.name === 'workspaces') { assert.equal(result.boundVersionId, null); assert.deepEqual(result.selection.columnIds, []); assert.equal(result.selection._id, undefined); }
      if (c.name === 'datasets') assert.equal(result.originalFile.storageKey, 'test/private-original.csv');
    });
  });
  for (const [name, _id] of inserted) assert.equal(await connection.db.collection(name).findOne({ _id }), null, 'test data must be rolled back');
});

test('Atlas: every declared unique index rejects duplicate key (11000)', async t => {
  for (const contract of COLLECTION_CONTRACTS) for (const index of contract.indexes.filter(i => i.unique)) {
    await t.test(`${contract.name}.${index.name}`, async () => {
      await rollback(async session => {
        const first = fresh(contract.name);
        const second = fresh(contract.name);
        // Change all other unique keys to prove THIS index is the constraint.
        if (contract.name === 'versionColumns') {
          if ('columnId' in index.key) second.position = 1; else second.columnId = randomUUID();
        }
        if (contract.name === 'previewChanges') {
          if ('rowId' in index.key) second.ordinal = 1; else second.rowId = randomUUID();
        }
        if (contract.name === 'processingOperations') {
          if ('resultVersionId' in index.key) second.idempotencyDigest = 'b'.repeat(64); else second.resultVersionId = id();
        }
        const collection = connection.db.collection(contract.name);
        await collection.insertOne(first, { session });
        await assert.rejects(collection.insertOne(second, { session }), e => e.code === 11000 && Object.keys(e.keyPattern).join(',') === Object.keys(index.key).join(','));
      });
    });
  }
});

test('Atlas: partial indexes allow multiple null candidates and unpublished versions', async () => {
  await rollback(async session => {
    for (let i = 0; i < 2; i++) {
      await connection.db.collection('processingPreviews').insertOne(fresh('processingPreviews', { candidateVersionId: null, status: 'building' }), { session });
      await connection.db.collection('datasetVersions').insertOne(fresh('datasetVersions', { state: 'building', versionNumber: null, publishedAt: null, contentHash: null }), { session });
    }
    // Same version number in a different dataset is legal.
    await connection.db.collection('datasetVersions').insertOne(fresh('datasetVersions', { datasetId: id() }), { session });
    await connection.db.collection('datasetVersions').insertOne(fresh('datasetVersions', { datasetId: id() }), { session });
    // Project names deliberately permit duplicates.
    await connection.db.collection('projects').insertOne(fresh('projects'), { session });
    await connection.db.collection('projects').insertOne(fresh('projects'), { session });
  });
});

test('Atlas: native-driver writes cannot bypass required fields or unknown-field checks', async t => {
  for (const c of COLLECTION_CONTRACTS) await t.test(c.name, async () => {
    const document = fresh(c.name);
    const field = c.validator.$jsonSchema.required.find(k => k !== '_id');
    delete document[field];
    await rejectWrite(c.name, document);
    await rejectWrite(c.name, fresh(c.name, { unexpected: true }));
  });
});

test('Atlas: nested validation, bounds, published metadata, chunk byte count and typed cells', async () => {
  await rejectWrite('workspaces', fresh('workspaces', { selection: { columnIds: ['bad-id'], cell: null } }));
  await rejectWrite('datasetVersions', fresh('datasetVersions', { versionNumber: null }));
  await rejectWrite('datasetVersions', fresh('datasetVersions', { rowCount: 0.5 }));
  await rejectWrite('datasetVersions', fresh('datasetVersions', { encodedByteSize: 100 * 1024 * 1024 + 1 }));
  await rejectWrite('dataChunks', fresh('dataChunks', { byteLength: payload.length + 1 }));
  await rejectWrite('dataChunks', fresh('dataChunks', { byteLength: 4 * 1024 * 1024 + 1 }));
  await rejectWrite('versionColumns', fresh('versionColumns', { logicalType: 'category' }));
  await rejectWrite('users', fresh('users', { emailNormalized: 'UNNORMALIZED@example.com' }));
  await rejectWrite('processingPreviews', fresh('processingPreviews', { summary: { ...summary, usedStatistics: [{ columnId, validCount: 1, missingCount: 0, mode: { kind: 'number', value: '123' } }] } }));
  const diagnostic = { code: 'TEST', message: 'test', path: 'value' };
  await rejectWrite('processingPreviews', fresh('processingPreviews', { diagnostics: { errorCount: 60, warningCount: 60, errors: Array(60).fill(diagnostic), warnings: Array(60).fill(diagnostic), truncated: false } }));
});

test('Atlas: preview cleanup has no TTL; session TTL is absolute expiresAt', async () => {
  const previewIndexes = await connection.db.collection('processingPreviews').listIndexes().toArray();
  assert.ok(previewIndexes.every(i => i.expireAfterSeconds === undefined));
  const sessionIndexes = await connection.db.collection('authSessions').listIndexes().toArray();
  assert.equal(sessionIndexes.find(i => i.name === 'ttl_sessions_expiry').expireAfterSeconds, 0);
});

test('Atlas: commit is durable and only the temporary record is cleaned up', async () => {
  const document = fresh('users');
  const session = await connection.startSession();
  try {
    session.startTransaction();
    await connection.db.collection('users').insertOne(document, { session });
    await session.commitTransaction();
    const saved = await connection.db.collection('users').findOne({ _id: document._id });
    assert.equal(saved.email, document.email);
    assert.equal(saved.writeEpoch, 0);
  } finally {
    if (session.inTransaction()) await session.abortTransaction();
    await session.endSession();
    await connection.db.collection('users').deleteOne({ _id: document._id });
  }
});

test('NestJS boots against Atlas; health pings the real database and detects disconnection', async () => {
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { getConnectionToken } = require('@nestjs/mongoose');
  const { AppModule } = require('../dist/app.module');
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const response = await fetch(base + '/api/v1/health');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, 'connected');
    await app.get(getConnectionToken()).close();
    assert.equal((await fetch(base + '/api/v1/health')).status, 503);
  } finally { await app.close(); }
});
