import { beforeAll, afterAll, describe, it, jest } from '@jest/globals';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { Types, type Connection } from 'mongoose';
import { MongoServerError, Binary, type ClientSession } from 'mongodb';
import { openDatabase } from '../../../../infrastructure/database/database.connection';
import { COLLECTION_CONTRACTS } from '../../../../infrastructure/database/collection-contracts';
import { verifyDatabase } from '../../../../infrastructure/database/database.provision';
import { record } from '../../../utils';
jest.setTimeout(120000);
describe('Database contracts (integration with Atlas)', () => {
    let connection: Connection;
    beforeAll(async () => { connection = await openDatabase(); await verifyDatabase(connection); });
    afterAll(async () => { await connection?.close(); });
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
    const fixtures: Record<string, Record<string, unknown>> = {
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
    async function rollback(work: (session: ClientSession) => Promise<void>) {
        const session = await connection.startSession();
        session.startTransaction();
        try {
            await work(session);
        }
        finally {
            if (session.inTransaction())
                await session.abortTransaction();
            await session.endSession();
        }
    }
    function fresh(name: string, patch: Record<string, unknown> = {}): Record<string, unknown> & {
        _id: Types.ObjectId;
    } { return { ...fixtures[name], _id: id(), ...patch }; }
    async function rejectWrite(name: string, document: Record<string, unknown>, code = 121) {
        await rollback(async (session) => {
            await assert.rejects(connection.db!.collection(name).insertOne(document, { session }), error => error instanceof MongoServerError && error.code === code);
        });
    }
    it.each(COLLECTION_CONTRACTS.map(contract => [contract.name, contract] as const))('%s round-trips through Mongoose and leaves no data after rollback', async (name, contract) => {
        let inserted: unknown;
        await rollback(async (session) => {
            const model = connection.model<Record<string, unknown>>(name, contract.schema, name);
            const [saved] = await model.create([fixtures[name]], { session });
            inserted = saved._id;
            const result = await model.findById(saved._id).session(session).lean();
            assert.ok(result);
            assert.ok(result._id instanceof Types.ObjectId);
            if (result.createdAt)
                assert.ok(result.createdAt instanceof Date);
            assert.equal(result.__v, undefined);
            if (name === 'dataChunks') {
                const data = result.payload;
                if (Buffer.isBuffer(data))
                    assert.deepEqual(data, payload);
                else {
                    assert.ok(data instanceof Binary);
                    assert.deepEqual(Buffer.from(data.buffer), payload);
                }
            }
            if (name === 'workspaces') {
                assert.equal(result.boundVersionId, null);
                assert.deepEqual(record(result.selection).columnIds, []);
                assert.equal(record(result.selection)._id, undefined);
            }
            if (name === 'datasets')
                assert.equal(record(result.originalFile).storageKey, 'test/private-original.csv');
        });
        assert.ok(inserted instanceof Types.ObjectId);
        assert.equal(await connection.db!.collection(name).findOne({ _id: inserted }), null);
    });
    const uniques = COLLECTION_CONTRACTS.flatMap(contract => contract.indexes.filter(index => index.unique).map(index => [contract.name + '.' + index.name, contract, index] as const));
    it.each(uniques)('%s rejects exactly its duplicate key', async (_label, contract, index) => {
        await rollback(async (session) => {
            const first = fresh(contract.name), second = fresh(contract.name);
            if (contract.name === 'versionColumns') {
                if ('columnId' in index.key)
                    second.position = 1;
                else
                    second.columnId = randomUUID();
            }
            if (contract.name === 'previewChanges') {
                if ('rowId' in index.key)
                    second.ordinal = 1;
                else
                    second.rowId = randomUUID();
            }
            if (contract.name === 'processingOperations') {
                if ('resultVersionId' in index.key)
                    second.idempotencyDigest = 'b'.repeat(64);
                else
                    second.resultVersionId = id();
            }
            const collection = connection.db!.collection(contract.name);
            await collection.insertOne(first, { session });
            await assert.rejects(collection.insertOne(second, { session }), error => error instanceof MongoServerError && error.code === 11000 && Object.keys(record(error.keyPattern)).join(',') === Object.keys(index.key).join(','));
        });
    });
    it.each(COLLECTION_CONTRACTS.map(contract => [contract.name, contract] as const))('%s enforces required and unknown fields for native driver writes', async (name, contract) => {
        const document = fresh(name);
        const required: unknown = record(contract.validator.$jsonSchema).required;
        assert.ok(Array.isArray(required));
        const field = required.find((value: unknown) => typeof value === 'string' && value !== '_id');
        assert.ok(typeof field === 'string');
        delete document[field];
        await rejectWrite(name, document);
        await rejectWrite(name, fresh(name, { unexpected: true }));
    });
    it('Atlas: partial indexes allow multiple null candidates and unpublished versions', async () => {
        await rollback(async (session) => {
            for (let i = 0; i < 2; i++) {
                await connection.db!.collection('processingPreviews').insertOne(fresh('processingPreviews', { candidateVersionId: null, status: 'building' }), { session });
                await connection.db!.collection('datasetVersions').insertOne(fresh('datasetVersions', { state: 'building', versionNumber: null, publishedAt: null, contentHash: null }), { session });
            }
            // Same version number in a different dataset is legal.
            await connection.db!.collection('datasetVersions').insertOne(fresh('datasetVersions', { datasetId: id() }), { session });
            await connection.db!.collection('datasetVersions').insertOne(fresh('datasetVersions', { datasetId: id() }), { session });
            // Project names deliberately permit duplicates.
            await connection.db!.collection('projects').insertOne(fresh('projects'), { session });
            await connection.db!.collection('projects').insertOne(fresh('projects'), { session });
        });
    });
    it('Atlas: nested validation, bounds, published metadata, chunk byte count and typed cells', async () => {
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
    it('Atlas: preview cleanup has no TTL; session TTL is absolute expiresAt', async () => {
        const previewIndexes = await connection.db!.collection('processingPreviews').listIndexes().toArray();
        assert.ok(previewIndexes.every(i => i.expireAfterSeconds === undefined));
        const sessionIndexes = await connection.db!.collection('authSessions').listIndexes().toArray();
        assert.equal(sessionIndexes.find(i => i.name === 'ttl_sessions_expiry')?.expireAfterSeconds, 0);
    });
    it('Atlas: commit is durable and only the temporary record is cleaned up', async () => {
        const document = fresh('users');
        const session = await connection.startSession();
        try {
            session.startTransaction();
            await connection.db!.collection('users').insertOne(document, { session });
            await session.commitTransaction();
            const saved = await connection.db!.collection('users').findOne({ _id: document._id });
            assert.ok(saved);
            assert.equal(saved.email, document.email);
            assert.equal(saved.writeEpoch, 0);
        }
        finally {
            if (session.inTransaction())
                await session.abortTransaction();
            await session.endSession();
            await connection.db!.collection('users').deleteOne({ _id: document._id });
        }
    });
});
