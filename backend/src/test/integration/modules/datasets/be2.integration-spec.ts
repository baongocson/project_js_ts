import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rmdir, utimes, access as fileAccess } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, record } from '../../../utils';
import { AccountCleanupService } from '../../../../infrastructure/database/account-cleanup.service';
import { IdempotencyService, sha256 } from '../../../../infrastructure/idempotency/idempotency.service';
import { IdempotencyRepository } from '../../../../infrastructure/idempotency/idempotency.repository';
import { OriginalStorageService } from '../../../../infrastructure/storage/original-storage.service';
import { DatasetsRepository } from '../../../../modules/datasets/datasets.repository';
import { DatasetsService } from '../../../../modules/datasets/datasets.service';
import { ProjectsRepository } from '../../../../modules/projects/projects.repository';
import { ImportRecoveryRepository } from '../../../../modules/datasets/import-recovery.repository';
import { ImportRecoveryService } from '../../../../modules/datasets/import-recovery.service';
import { OperationWriterRepository } from '../../../../modules/processing/operation-writer.repository';
import { ProjectsService } from '../../../../modules/projects/projects.service';
import { OwnershipService } from '../../../../modules/auth/security/ownership.service';
import { SnapshotPublisherService } from '../../../../modules/datasets/snapshot-publisher.service';
import type { Principal } from '../../../../modules/auth/security/auth-context';
import type { IncomingMessage, ServerResponse } from 'node:http';

jest.setTimeout(120_000);
describe('BE-2 real MongoDB + filesystem + protected HTTP', () => {
  const run = randomUUID(), emails = [`be2-${run}@example.com`, `be2-other-${run}@example.com`];
  let fixture: Awaited<ReturnType<typeof createTestApp>>, connection: Connection, root: string;
  let access: string, otherAccess: string, principal: Principal;
  let projectId: string, datasetId: string, versionId: string, columns: { columnId: string; logicalType: string }[], rowId: string;
  const previousRoot = process.env.ORIGINAL_STORAGE_ROOT;
  const csv = Buffer.from('\ufeffn,code,date,text,missing\r\n2,00123,2024-02-29,"a\r\nb",N/A\r\n1,00001,2024-03-01,z, \r\n3,00002,2024-03-02,a,\r\n');
  const auth = () => `Bearer ${access}`;
  const api = '/api/v1';
  async function create(key = randomUUID(), name = 'BE2 project') {
    const response = await request(fixture.server).post(`${api}/projects`).set('Authorization', auth()).set('Idempotency-Key', key).send({ name }).expect(201);
    return String(record(record(response.body).project)._id);
  }
  function upload(id: string, key: string, data = csv, options = '{}') {
    return request(fixture.server).post(`${api}/projects/${id}/datasets`).set('Authorization', auth()).set('Idempotency-Key', key).field('importOptions', options).attach('file', data, 'source.csv');
  }
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'be2-'));
    process.env.ORIGINAL_STORAGE_ROOT = root;
    fixture = await createTestApp(true);
    connection = fixture.app.get<Connection>(getConnectionToken());
    const origin = fixture.app.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN').split(',')[0].trim();
    const tokens: string[] = [];
    for (const email of emails) {
      await request(fixture.server).post(`${api}/auth/register`).set('Origin', origin).send({ email, password: 'be2-test-password-123' }).expect(201);
      const response = await request(fixture.server).post(`${api}/auth/login`).set('Origin', origin).send({ email, password: 'be2-test-password-123' }).expect(200);
      tokens.push(String(record(response.body).accessToken));
    }
    [access, otherAccess] = tokens;
    const user = await connection.db!.collection('users').findOne({ emailNormalized: emails[0] });
    const session = await connection.db!.collection('authSessions').findOne({ userId: user!._id, revokedAt: null });
    principal = { userId: user!._id.toHexString(), sessionId: session!._id.toHexString() };
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    if (connection?.db && fixture) {
      const cleanup = fixture.app.get(AccountCleanupService);
      for await (const user of connection.db.collection('users').find({ emailNormalized: { $in: emails } })) { await cleanup.markUserDeleting(user._id); await cleanup.removeUser(user._id); }
    }
    await fixture?.close();
    if (previousRoot === undefined) delete process.env.ORIGINAL_STORAGE_ROOT; else process.env.ORIGINAL_STORAGE_ROOT = previousRoot;
    if (root) await rmdir(root);
  });
  it('creates project + defaults atomically, replays responses, rejects mismatched keys and isolates owners', async () => {
    const key = randomUUID();
    projectId = await create(key);
    expect(await create(key)).toBe(projectId);
    await request(fixture.server).post(`${api}/projects`).set('Authorization', auth()).set('Idempotency-Key', key).send({ name: 'different' }).expect(409);
    const detail = await request(fixture.server).get(`${api}/projects/${projectId}`).set('Authorization', auth()).expect(200);
    expect(record(detail.body)).toMatchObject({ project: { lifecycle: 'empty' }, dataset: null, workspace: { revision: 1, activeTab: 'collection', tableState: { page: 1, pageSize: 10 } } });
    await request(fixture.server).get(`${api}/projects/${projectId}`).set('Authorization', `Bearer ${otherAccess}`).expect(403);
    await request(fixture.server).get(`${api}/projects/invalid`).expect(401);
    await request(fixture.server).get(`${api}/projects/invalid`).set('Authorization', auth()).expect(400);
    await request(fixture.server).get(`${api}/projects?limit=101`).set('Authorization', auth()).expect(400);
    const list = await request(fixture.server).get(`${api}/projects?sort=name&lifecycle=empty&limit=1`).set('Authorization', auth()).expect(200);
    expect(record(list.body).total).toBe(1);
    const far = await request(fixture.server).get(`${api}/projects?page=${Number.MAX_SAFE_INTEGER}&limit=100`).set('Authorization', auth()).expect(200);
    expect(record(far.body).items).toEqual([]);
    const renamed = await request(fixture.server).patch(`${api}/projects/${projectId}`).set('Authorization', auth()).send({ name: 'Renamed' }).expect(200);
    expect(record(renamed.body).name).toBe('Renamed');
  });
  it('serializes concurrent creation and supports same-key retry after loss of response', async () => {
    const key = randomUUID();
    const responses = await Promise.all([0, 1, 2].map(() => request(fixture.server).post(`${api}/projects`).set('Authorization', auth()).set('Idempotency-Key', key).send({ name: 'Concurrent' })));
    expect(responses.every(response => [201, 409].includes(response.status))).toBe(true);
    expect(responses.some(response => response.status === 201)).toBe(true);
    const id = await create(key, 'Concurrent');
    for (const response of responses.filter(response => response.status === 201)) expect(record(record(response.body).project)._id).toBe(id);
    expect(await connection.db!.collection('projects').countDocuments({ ownerId: new Types.ObjectId(principal.userId), name: 'Concurrent' })).toBe(1);
  });
  it('replays a committed project after the actual HTTP response connection is lost', async () => {
    const key = randomUUID();
    const drop = (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'POST' && req.url === `${api}/projects`) res.end = (() => { res.destroy(); return res; }) as typeof res.end;
    };
    fixture.server.prependListener('request', drop);
    try {
      await expect(request(fixture.server).post(`${api}/projects`).set('Authorization', auth()).set('Idempotency-Key', key).send({ name: 'Lost response' })).rejects.toBeDefined();
    } finally { fixture.server.removeListener('request', drop); }
    const receipt = await connection.db!.collection('idempotencyRecords').findOne({ userId: new Types.ObjectId(principal.userId), keyDigest: sha256(key) });
    expect(receipt!.status).toBe('succeeded');
    const replayed = await create(key, 'Lost response');
    expect(String(record(record(record(receipt!.response).body).project)._id)).toBe(replayed);
    expect(await connection.db!.collection('projects').countDocuments({ ownerId: new Types.ObjectId(principal.userId), name: 'Lost response' })).toBe(1);
  });
  it('persists workspace patches with one CAS winner, unchanged revision on no-op, and rejects stale bases', async () => {
    const route = `${api}/projects/${projectId}/workspace`;
    const same = await request(fixture.server).patch(route).set('Authorization', auth()).send({ revision: 1, boundVersionId: null, activeTab: 'collection' }).expect(200);
    expect(record(record(same.body).workspace).revision).toBe(1);
    const responses = await Promise.all(['cleaning', 'history'].map(activeTab => request(fixture.server).patch(route).set('Authorization', auth()).send({ revision: 1, boundVersionId: null, activeTab })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    await request(fixture.server).patch(route).set('Authorization', auth()).send({ revision: 2, boundVersionId: new Types.ObjectId().toHexString(), activeTab: 'collection' }).expect(409);
    await request(fixture.server).patch(route).set('Authorization', auth()).send({ revision: 2, boundVersionId: null }).expect(400);
  });
  it('imports exact source bytes, publishes V1 with history/receipt, replays and protects all reads', async () => {
    const key = randomUUID();
    const response = await upload(projectId, key).expect(201);
    const body = record(response.body), dataset = record(body.dataset), version = record(body.version);
    datasetId = String(dataset._id); versionId = String(version._id);
    columns = body.columns as typeof columns;
    expect(columns.map(column => column.logicalType)).toEqual(['number', 'text', 'date', 'text', 'text']);
    expect(JSON.stringify(body)).not.toContain('storageKey');
    expect(record((await upload(projectId, key).expect(201)).body)).toEqual(body);
    await upload(projectId, key, Buffer.from('different\nx')).expect(409);
    await upload(projectId, randomUUID()).expect(409);
    const stored = await connection.db!.collection('datasets').findOne({ _id: new Types.ObjectId(datasetId) });
    const source = await fixture.app.get(OriginalStorageService).read(String(record(stored!.originalFile).storageKey));
    expect(Buffer.from(source)).toEqual(csv);
    expect(record(stored!.originalFile).sha256).toBe(sha256(csv));
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId), kind: 'import' })).toBe(1);
    await request(fixture.server).get(`${api}/datasets/${datasetId}/versions/${versionId}`).set('Authorization', auth()).expect(200);
    await request(fixture.server).get(`${api}/datasets/${datasetId}/versions/${versionId}`).set('Authorization', `Bearer ${otherAccess}`).expect(403);
    await request(fixture.server).get(`${api}/datasets/${datasetId}/versions/${new Types.ObjectId()}`).set('Authorization', auth()).expect(404);
  });
  it('reads typed rows, paginates, filters and sorts with missing last, and looks up outside the current page', async () => {
    const base = `${api}/datasets/${datasetId}/versions/${versionId}/rows`;
    const page = await request(fixture.server).get(base).query({ limit: 1, page: 1, sort: `${columns[0].columnId}:asc` }).set('Authorization', auth()).expect(200);
    expect(record(page.body)).toMatchObject({ totalRows: 3, filteredRows: 3, totalPages: 3 });
    const row = record((record(page.body).rows as unknown[])[0]); rowId = String(row.rowId);
    expect(record(record(row.cells)[columns[0].columnId])).toEqual({ kind: 'number', value: 1 });
    const filtered = await request(fixture.server).get(base).query({ filters: JSON.stringify([{ columnId: columns[0].columnId, op: 'gt', value: { kind: 'number', value: 1 } }]) }).set('Authorization', auth()).expect(200);
    expect(record(filtered.body).filteredRows).toBe(2);
    await request(fixture.server).get(base).query({ sort: `${randomUUID()}:asc` }).set('Authorization', auth()).expect(400);
    const lookup = await request(fixture.server).get(`${base}/${rowId}`).set('Authorization', auth()).expect(200);
    expect(record(record(lookup.body).row).rowId).toBe(rowId);
    await request(fixture.server).get(`${base}/${randomUUID()}`).set('Authorization', auth()).expect(404);
    const before = await connection.db!.collection('workspaces').findOne({ projectId: new Types.ObjectId(projectId) });
    await request(fixture.server).get(`${api}/projects/${projectId}`).set('Authorization', auth()).expect(200);
    const after = await connection.db!.collection('workspaces').findOne({ _id: before!._id });
    expect(after).toEqual(before);
  });
  it('returns positioned CSV errors, validates overrides, accepts header-only and rejects oversized source', async () => {
    const id = await create();
    const invalid = await upload(id, randomUUID(), Buffer.from('a,b\n1')).expect(400);
    expect(record(record(record(invalid.body).error).details).issues).toEqual([expect.objectContaining({ code: 'CSV_FIELD_COUNT_MISMATCH', recordIndex: 2, lineStart: 2, lineEnd: 2 })]);
    await upload(id, randomUUID(), Buffer.from('a\n00123'), JSON.stringify({ columnTypes: [{ position: 1, logicalType: 'number' }] })).expect(400);
    await upload(id, randomUUID(), Buffer.alloc(16_000_001, 65)).expect(413);
    const headerOnly = await upload(id, randomUUID(), Buffer.from('a,a,""\n')).expect(201);
    expect(record(record(headerOnly.body).version).rowCount).toBe(0);
    const exact = Buffer.alloc(16_000_000, 65); exact[1] = 10;
    const boundary = await upload(await create(), randomUUID(), exact).expect(201);
    expect(record(record(record(boundary.body).dataset).originalFile).byteSize).toBe(16_000_000);
  });
  it('detects checksum corruption instead of serving unverified snapshot data', async () => {
    const chunk = await connection.db!.collection('dataChunks').findOne({ versionId: new Types.ObjectId(versionId), chunkIndex: 0 });
    await connection.db!.collection('dataChunks').updateOne({ _id: chunk!._id }, { $set: { sha256: '0'.repeat(64) } });
    try {
      const result = await request(fixture.server).get(`${api}/datasets/${datasetId}/versions/${versionId}/rows`).set('Authorization', auth()).expect(503);
      expect(record(record(result.body).error).code).toBe('SNAPSHOT_CORRUPT');
    } finally { await connection.db!.collection('dataChunks').updateOne({ _id: chunk!._id }, { $set: { sha256: chunk!.sha256 } }); }
  });
  it('persists multiple binary chunks and decodes one record across their boundary', async () => {
    const id = await create(), data = Buffer.from('a\n"' + 'é'.repeat(2_200_000) + '"');
    const response = await upload(id, randomUUID(), data).expect(201);
    const imported = record(response.body), version = String(record(imported.version)._id), dataset = String(record(imported.dataset)._id);
    const chunks = await connection.db!.collection('dataChunks').find({ versionId: new Types.ObjectId(version) }).sort({ chunkIndex: 1 }).toArray();
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) { expect(chunk.byteLength).toBeLessThanOrEqual(4 * 1024 * 1024); expect(chunk.sha256).toBe(sha256(chunk.payload.buffer)); }
    const snapshot = await fixture.app.get(DatasetsRepository).snapshot(dataset, version);
    expect(snapshot.rows[0].cells[snapshot.columns[0].columnId].value).toBe('é'.repeat(2_200_000));
    // Exercise the large response using Node's HTTP client independently of Superagent.
    if (!fixture.server.listening) await new Promise<void>(resolve => fixture.server.listen(0, '127.0.0.1', resolve));
    const address = fixture.server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const responseRows = await fetch(`http://127.0.0.1:${address.port}${api}/datasets/${dataset}/versions/${version}/rows`, { headers: { Authorization: auth() } });
    expect(responseRows.status).toBe(200);
    const body: unknown = await responseRows.json();
    const cells = record(record((record(body).rows as unknown[])[0]).cells);
    expect(String(record(Object.values(cells)[0]).value).length).toBe(2_200_000);
  });
  it('publishes one of two competing candidates, atomically rolls back participants and restores into a new immutable version', async () => {
    const publisher = fixture.app.get(SnapshotPublisherService), receipts = fixture.app.get(IdempotencyService), repository = fixture.app.get(DatasetsRepository);
    const original = await repository.snapshot(datasetId, versionId), candidate = structuredClone(original);
    candidate.rows[0].cells[columns[0].columnId] = { kind: 'number', value: 4 };
    const summary = { before: { rowCount: 3, columnCount: 5 }, after: { rowCount: 3, columnCount: 5 }, insertedRowCount: 0, deletedRowCount: 0, updatedRowCount: 1, updatedCellCount: 1, addedColumnCount: 0, removedColumnCount: 0, typeChangedColumnCount: 0, metadataChangedColumnCount: 0, usedStatistics: [] };
    const specification = { method: 'edit_cell', engineVersion: 'be2-contract-test', parameters: { value: { kind: 'number', value: 4 } }, scope: { type: 'cell', rowId: original.rows[0].rowId, columnId: columns[0].columnId }, statisticsScope: { type: 'whole-columns' } };
    const keys = [randomUUID(), randomUUID()], leases = [];
    for (const key of keys) {
      const claim = await receipts.claim(principal, projectId, 'be2.publish-contract', key, specification);
      if (claim.replay) throw new Error('Expected lease');
      leases.push(claim.lease);
    }
    const candidates: string[] = [];
    for (const lease of leases) candidates.push(await publisher.prepare(lease, datasetId, versionId, candidate));
    const input = (index: number) => ({ datasetId, candidateVersionId: candidates[index], expectedCurrentVersionId: versionId, expectedRevision: 1, kind: 'process' as const, specification, summary });
    await expect(publisher.publish(leases[0], input(0), () => ({}), async () => { throw new Error('Participant failed'); })).rejects.toThrow('Participant failed');
    expect((await repository.byId(datasetId)).currentVersionId!.toHexString()).toBe(versionId);
    const results = await Promise.allSettled(leases.map((lease, index) => receipts.run(lease, () => publisher.publish(lease, input(index), (versionNumber, operationId) => ({ versionNumber, operationId, resultVersionId: candidates[index] }), async () => {}))));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const winner = results.findIndex(result => result.status === 'fulfilled');
    const replay = await receipts.claim(principal, projectId, 'be2.publish-contract', keys[winner], specification);
    expect(replay).toMatchObject({ replay: true, body: { versionNumber: 2, resultVersionId: candidates[winner] } });
    expect(await repository.snapshot(datasetId, versionId)).toEqual(original);
    const restoreClaim = await receipts.claim(principal, projectId, 'be2.restore-contract', randomUUID(), { targetVersionId: versionId });
    if (restoreClaim.replay) throw new Error('Expected lease');
    const restored = await publisher.prepare(restoreClaim.lease, datasetId, candidates[winner], original, versionId);
    await receipts.run(restoreClaim.lease, () => publisher.publish(restoreClaim.lease, { datasetId, candidateVersionId: restored, expectedCurrentVersionId: candidates[winner], expectedRevision: 2, kind: 'restore', specification: { targetVersionId: new Types.ObjectId(versionId) }, summary }, (versionNumber, operationId) => ({ versionNumber, operationId }), async () => {}));
    expect(await repository.snapshot(datasetId, restored)).toEqual(original);
    const version = await connection.db!.collection('datasetVersions').findOne({ _id: new Types.ObjectId(restored) });
    expect(version).toMatchObject({ versionNumber: 3, parentVersionId: new Types.ObjectId(candidates[winner]), restoredFromVersionId: new Types.ObjectId(versionId), state: 'published' });
    const loser = candidates[1 - winner];
    await connection.db!.collection('datasetVersions').updateOne({ _id: new Types.ObjectId(loser) }, { $set: { createdAt: new Date(0) } });
    await fixture.app.get(ImportRecoveryService).recover(projectId);
    expect(await connection.db!.collection('datasetVersions').findOne({ _id: new Types.ObjectId(loser) })).toBeNull();
    expect(await repository.snapshot(datasetId, versionId)).toEqual(original);
    expect(await repository.snapshot(datasetId, restored)).toEqual(original);
    const limitClaim = await receipts.claim(principal, projectId, 'be2.publisher-limit', randomUUID(), {});
    if (limitClaim.replay) throw new Error('Expected lease');
    const oversized = structuredClone(original);
    oversized.rows[0].cells[columns[3].columnId] = { kind: 'text', value: 'x'.repeat(100 * 1024 * 1024) };
    const countBefore = await connection.db!.collection('datasetVersions').countDocuments({ datasetId: new Types.ObjectId(datasetId) });
    await expect(receipts.run(limitClaim.lease, () => publisher.prepare(limitClaim.lease, datasetId, restored, oversized))).rejects.toMatchObject({ status: 413 });
    expect(await connection.db!.collection('datasetVersions').countDocuments({ datasetId: new Types.ObjectId(datasetId) })).toBe(countBefore);
  });
  it('automatically heartbeats while work is in progress', async () => {
    const ownership = fixture.app.get(OwnershipService), id = await create();
    const service = new IdempotencyService(ownership, new ConfigService({ IDEMPOTENCY_LEASE_MS: 1500, IDEMPOTENCY_HEARTBEAT_MS: 150 }), new IdempotencyRepository(connection));
    const claim = await service.claim(principal, id, 'be2.automatic-heartbeat', randomUUID(), {});
    if (claim.replay) throw new Error('Expected lease');
    const before = await connection.db!.collection('idempotencyRecords').findOne({ _id: claim.lease.id });
    await service.run(claim.lease, async () => {
      await new Promise(resolve => setTimeout(resolve, 650));
      const during = await connection.db!.collection('idempotencyRecords').findOne({ _id: claim.lease.id });
      expect(during!.leaseUntil.getTime()).toBeGreaterThan(before!.leaseUntil.getTime());
    });
  });
  it('does not replay a durable receipt through error recovery after session revocation', async () => {
    const id = await create(), service = fixture.app.get(IdempotencyService), repository = fixture.app.get(DatasetsRepository);
    const claim = await service.claim(principal, id, 'be2.replay-permission', randomUUID(), {});
    if (claim.replay) throw new Error('Expected lease');
    try {
      await expect(service.run(claim.lease, async () => {
        await repository.transaction(session => service.complete(claim.lease, 201, { value: 1 }, session));
        await connection.db!.collection('authSessions').updateOne({ _id: new Types.ObjectId(principal.sessionId) }, { $set: { revokedAt: new Date() } });
        throw new Error('Response failed after commit');
      })).rejects.toMatchObject({ status: 401 });
    } finally { await connection.db!.collection('authSessions').updateOne({ _id: new Types.ObjectId(principal.sessionId) }, { $set: { revokedAt: null } }); }
  });
  it('rolls back publish when ledger write fails, then resumes the same request after lease expiry', async () => {
    const id = await create(), key = randomUUID();
    const spy = jest.spyOn(fixture.app.get(OperationWriterRepository), 'append').mockRejectedValueOnce(new Error('Injected ledger failure'));
    await upload(id, key).expect(500);
    spy.mockRestore();
    const dataset = await connection.db!.collection('datasets').findOne({ projectId: new Types.ObjectId(id) });
    expect(dataset!.currentVersionId).toBeNull();
    expect(await connection.db!.collection('datasetVersions').countDocuments({ datasetId: dataset!._id, state: 'published' })).toBe(0);
    await connection.db!.collection('idempotencyRecords').updateOne({ projectId: new Types.ObjectId(id), keyDigest: sha256(key) }, { $set: { leaseUntil: new Date(0) } });
    const response = await upload(id, key).expect(201);
    expect(await connection.db!.collection('datasets').countDocuments({ projectId: new Types.ObjectId(id) })).toBe(1);
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(String(record(record(response.body).dataset)._id)) })).toBe(1);
    // discardImport removes the graph; its file is removed before the retry writes a new source.
  });
  it('heartbeats leases, refuses early takeover, fences expired workers and recovers abandoned import', async () => {
    const service = fixture.app.get(IdempotencyService), repository = fixture.app.get(DatasetsRepository);
    const id = await create(), key = randomUUID();
    const claim = await service.claim(principal, id, 'be2.lease-test', key, { a: 1 });
    if (claim.replay) throw new Error('Expected a lease');
    await expect(service.claim(principal, id, 'be2.lease-test', key, { a: 1 })).rejects.toMatchObject({ status: 409 });
    const old = await connection.db!.collection('idempotencyRecords').findOne({ _id: claim.lease.id });
    await repository.transaction(session => service.touch(claim.lease, session));
    const renewed = await connection.db!.collection('idempotencyRecords').findOne({ _id: claim.lease.id });
    expect(renewed!.leaseUntil.getTime()).toBeGreaterThanOrEqual(old!.leaseUntil.getTime());
    await connection.db!.collection('idempotencyRecords').updateOne({ _id: claim.lease.id }, { $set: { leaseUntil: new Date(0) } });
    const takeover = await service.claim(principal, id, 'be2.lease-test', key, { a: 1 });
    expect(takeover.replay).toBe(false);
    await expect(repository.transaction(session => service.touch(claim.lease, session))).rejects.toMatchObject({ status: 409 });
    const failureKey = randomUUID();
    const spy = jest.spyOn(fixture.app.get(OperationWriterRepository), 'append').mockRejectedValueOnce(new Error('abandon import'));
    await upload(id, failureKey).expect(500); spy.mockRestore();
    await connection.db!.collection('idempotencyRecords').updateOne({ projectId: new Types.ObjectId(id), keyDigest: sha256(failureKey) }, { $set: { leaseUntil: new Date(0) } });
    const restartConfig = new ConfigService({ DATABASE_ENABLED: 'true', IMPORT_RECOVERY_ENABLED: 'true' });
    const restarted = new ImportRecoveryService(repository, fixture.app.get(OriginalStorageService), restartConfig, fixture.app.get(ImportRecoveryRepository));
    const realRecover = restarted.recover.bind(restarted);
    const scoped = jest.spyOn(restarted, 'recover').mockImplementation(() => realRecover(id));
    const previousRecovery = process.env.IMPORT_RECOVERY_ENABLED;
    process.env.IMPORT_RECOVERY_ENABLED = 'true';
    try { restarted.onApplicationBootstrap(); }
    finally { if (previousRecovery === undefined) delete process.env.IMPORT_RECOVERY_ENABLED; else process.env.IMPORT_RECOVERY_ENABLED = previousRecovery; }
    try { await restarted.onModuleDestroy(); } finally { scoped.mockRestore(); }
    expect(await connection.db!.collection('datasets').countDocuments({ projectId: new Types.ObjectId(id) })).toBe(0);
    await upload(id, failureKey).expect(201);
  });
  it('keeps a deleting marker on cleanup failure, blocks writes and completes scoped recovery', async () => {
    const id = await create(); await upload(id, randomUUID()).expect(201);
    const cleanup = fixture.app.get(AccountCleanupService), spy = jest.spyOn(cleanup, 'removeProject').mockRejectedValueOnce(new Error('injected cleanup failure'));
    await request(fixture.server).delete(`${api}/projects/${id}`).set('Authorization', auth()).expect(503); spy.mockRestore();
    await request(fixture.server).get(`${api}/projects/${id}`).set('Authorization', auth()).expect(404);
    await request(fixture.server).patch(`${api}/projects/${id}`).set('Authorization', auth()).send({ name: 'x' }).expect(409);
    await expect(fixture.app.get(DatasetsRepository).transaction(session => fixture.app.get(OwnershipService).fence(principal, id, session))).rejects.toMatchObject({ status: 409 });
    await fixture.app.get(ProjectsService).recover(id);
    expect(await connection.db!.collection('projects').findOne({ _id: new Types.ObjectId(id) })).toBeNull();
    const success = await create();
    await request(fixture.server).delete(`${api}/projects/${success}`).set('Authorization', auth()).expect(204);
    expect(await connection.db!.collection('workspaces').countDocuments({ projectId: new Types.ObjectId(success) })).toBe(0);
  });
  it('fences an import racing delete, waits for filesystem writes before204 and recovers orphan files', async () => {
    const id = await create(), key = randomUUID(), storage = fixture.app.get(OriginalStorageService);
    const realPut = storage.put.bind(storage);
    let entered!: () => void, release!: () => void, storageKey = '';
    const started = new Promise<void>(resolve => { entered = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const spy = jest.spyOn(storage, 'put').mockImplementationOnce(async (name, bytes) => { storageKey = name; entered(); await barrier; await realPut(name, bytes); });
    const importing = upload(id, key).then(response => response);
    let deleting: Promise<request.Response> | undefined, deleteFinished = false;
    try {
      await started;
      const pending = await upload(id, key).expect(409);
      expect(Number(pending.headers['retry-after'])).toBeGreaterThan(0);
      deleting = request(fixture.server).delete(`${api}/projects/${id}`).set('Authorization', auth()).expect(204).then(response => { deleteFinished = true; return response; });
      const deadline = Date.now() + 5000;
      while ((await connection.db!.collection('projects').findOne({ _id: new Types.ObjectId(id) }))?.lifecycle !== 'deleting') {
        if (Date.now() > deadline) throw new Error('Delete did not fence project');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(deleteFinished).toBe(false);
    } finally { release(); spy.mockRestore(); }
    expect((await importing).status).toBe(409);
    await deleting;
    expect(await connection.db!.collection('datasets').findOne({ projectId: new Types.ObjectId(id) })).toBeNull();
    const file = join(root, storageKey);
    await expect(fileAccess(file)).rejects.toMatchObject({ code: 'ENOENT' });
    // A source left by an earlier crashed process has no running writer to await.
    await realPut(storageKey, csv);
    await utimes(file, new Date(0), new Date(0));
    await fixture.app.get(ImportRecoveryService).recover(id);
    await expect(fileAccess(file)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('resumes durable project deletion at startup and on the scheduled callback', async () => {
    const repository = fixture.app.get(ProjectsRepository), ownership = fixture.app.get(OwnershipService);
    let target = await create();
    const mark = () => repository.transaction(async session => { await ownership.fence(principal, target, session); await repository.markDeleting(target, session); });
    await mark();
    const restartConfig = new ConfigService({ DATABASE_ENABLED: 'true', PROJECT_CLEANUP_ENABLED: 'true' });
    const restarted = new ProjectsService(repository, ownership, fixture.app.get(IdempotencyService), fixture.app.get(DatasetsService), fixture.app.get(AccountCleanupService), restartConfig);
    const actual = restarted.recover.bind(restarted);
    const scoped = jest.spyOn(restarted, 'recover').mockImplementation(() => actual(target));
    const interval = jest.spyOn(global, 'setInterval');
    try {
      const previousCleanup = process.env.PROJECT_CLEANUP_ENABLED;
      process.env.PROJECT_CLEANUP_ENABLED = 'true';
      try { restarted.onApplicationBootstrap(); }
      finally { if (previousCleanup === undefined) delete process.env.PROJECT_CLEANUP_ENABLED; else process.env.PROJECT_CLEANUP_ENABLED = previousCleanup; }
      const deadline = Date.now() + 5000;
      while (await connection.db!.collection('projects').findOne({ _id: new Types.ObjectId(target) })) {
        if (Date.now() > deadline) throw new Error('Startup recovery did not complete');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      target = await create(); await mark();
      const callback = interval.mock.calls.find(call => call[1] === 60_000)?.[0];
      if (typeof callback !== 'function') throw new Error('Recovery callback missing');
      callback();
      await restarted.onModuleDestroy();
      expect(await connection.db!.collection('projects').findOne({ _id: new Types.ObjectId(target) })).toBeNull();
    } finally { await restarted.onModuleDestroy(); scoped.mockRestore(); interval.mockRestore(); }
  });
});
