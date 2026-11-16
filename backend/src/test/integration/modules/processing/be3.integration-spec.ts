import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, record } from '../../../utils';
import { AccountCleanupService } from '../../../../infrastructure/database/account-cleanup.service';
import { DatasetsRepository } from '../../../../modules/datasets/datasets.repository';

/**
 * Requires the isolated single-node replica from `npm run test:integration:local -w backend`.
 * This suite uses the real authenticated HTTP boundary, BSON, Mongo transactions,
 * snapshot codec and receipt persistence. It never uses an Atlas/application URI.
 */
jest.setTimeout(120_000);
describe('BE-3 HTTP + MongoDB integration: preview, apply, history, restore and analysis', () => {
  const run = randomUUID();
  const emails = [`be3-${run}@example.com`, `be3-other-${run}@example.com`];
  const api = '/api/v1';
  const csv = Buffer.from('x,y,z,label\n1,2,3,a\n2,3,4,b\n3,4,5,a\n', 'utf8');
  const previousRoot = process.env.ORIGINAL_STORAGE_ROOT;
  let fixture: Awaited<ReturnType<typeof createTestApp>>;
  let connection: Connection;
  let root: string;
  let ownerToken: string;
  let otherToken: string;
  let projectId: string;
  let datasetId: string;
  let v1: string;
  let v2: string;
  let v3: string;
  let columns: string[];
  let firstRowId: string;
  let previewId: string;
  let firstPreviewKey: string;
  let firstApplyKey: string;
  let firstApplyBody: Record<string, unknown>;
  const auth = () => `Bearer ${ownerToken}`;
  const foreign = () => `Bearer ${otherToken}`;
  const datasetUrl = () => `${api}/datasets/${datasetId}`;
  const rowUrl = (version: string) => `${datasetUrl()}/versions/${version}/rows`;
  const specification = (baseVersionId: string, value: number) => ({
    baseVersionId,
    specification: {
      method: 'edit_cell', parameters: { value: { kind: 'number', value } },
      scope: { type: 'cell', rowId: firstRowId, columnId: columns[0] },
      statisticsScope: { type: 'whole-columns' },
    },
  });
  const createPreview = (body: ReturnType<typeof specification>, key: string = randomUUID()) =>
    request(fixture.server).post(`${datasetUrl()}/previews`)
      .set('Authorization', auth()).set('Idempotency-Key', key).send(body);
  const apply = (id: string, key: string = randomUUID()) =>
    request(fixture.server).post(`${datasetUrl()}/operations`)
      .set('Authorization', auth()).set('Idempotency-Key', key).send({ previewId: id });

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'be3-integration-'));
    process.env.ORIGINAL_STORAGE_ROOT = root;
    fixture = await createTestApp(true);
    connection = fixture.app.get<Connection>(getConnectionToken());
    const origin = fixture.app.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN').split(',')[0].trim();
    const tokens: string[] = [];
    for (const email of emails) {
      await request(fixture.server).post(`${api}/auth/register`).set('Origin', origin)
        .send({ email, password: 'be3-integration-pass-123' }).expect(201);
      const response = await request(fixture.server).post(`${api}/auth/login`).set('Origin', origin)
        .send({ email, password: 'be3-integration-pass-123' }).expect(200);
      tokens.push(String(record(response.body).accessToken));
    }
    [ownerToken, otherToken] = tokens;
    const project = await request(fixture.server).post(`${api}/projects`).set('Authorization', auth())
      .set('Idempotency-Key', randomUUID()).send({ name: `BE3 integration ${run}` }).expect(201);
    projectId = String(record(record(project.body).project)._id);
    const imported = await request(fixture.server).post(`${api}/projects/${projectId}/datasets`)
      .set('Authorization', auth()).set('Idempotency-Key', randomUUID())
      .field('importOptions', '{}').attach('file', csv, 'be3.csv').expect(201);
    const result = record(imported.body);
    datasetId = String(record(result.dataset)._id);
    v1 = String(record(result.version)._id);
    columns = (result.columns as unknown[]).map(column => String(record(column).columnId));
    expect(columns).toHaveLength(4);
    const rows = await request(fixture.server).get(rowUrl(v1)).set('Authorization', auth()).expect(200);
    firstRowId = String(record((record(rows.body).rows as unknown[])[0]).rowId);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    try {
      if (fixture && connection?.db) {
        const cleanup = fixture.app.get(AccountCleanupService);
        for await (const user of connection.db.collection('users').find({ emailNormalized: { $in: emails } })) {
          await cleanup.markUserDeleting(user._id);
          await cleanup.removeUser(user._id);
        }
      }
    } finally {
      await fixture?.close();
      if (previousRoot === undefined) delete process.env.ORIGINAL_STORAGE_ROOT;
      else process.env.ORIGINAL_STORAGE_ROOT = previousRoot;
      if (root) await rm(root, { force: true, recursive: true });
    }
  });

  it('keeps previews private, shows exact changed rows, and replays the same preview key', async () => {
    firstPreviewKey = randomUUID();
    const body = specification(v1, 10);
    const created = await createPreview(body, firstPreviewKey).expect(201);
    const preview = record(created.body);
    expect(preview).toMatchObject({ status: 'ready', canApply: true, baseVersionId: v1 });
    previewId = String(preview.previewId);
    expect((await createPreview(body, firstPreviewKey).expect(201)).body).toEqual(created.body);
    await createPreview(specification(v1, 11), firstPreviewKey).expect(409);
    const details = await request(fixture.server).get(`${datasetUrl()}/previews/${previewId}`)
      .query({ page: 1, limit: 1 }).set('Authorization', auth()).expect(200);
    expect(record(details.body).totalChanges).toBe(1);
    const change = record((record(details.body).changes as unknown[])[0]);
    expect(change.rowId).toBe(firstRowId);
    expect(record(record(change.beforeCells)[columns[0]])).toMatchObject({ kind: 'number', value: 1 });
    expect(record(record(change.afterCells)[columns[0]])).toMatchObject({ kind: 'number', value: 10 });
    await request(fixture.server).get(`${datasetUrl()}/previews/${previewId}`)
      .set('Authorization', foreign()).expect(403);
    const dataset = await connection.db!.collection('datasets').findOne({ _id: new Types.ObjectId(datasetId) });
    expect(dataset!.currentVersionId.toHexString()).toBe(v1);
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId), kind: 'process' })).toBe(0);
  });

  it('publishes one immutable version and operation; retrying Apply cannot publish twice', async () => {
    firstApplyKey = randomUUID();
    const created = await apply(previewId, firstApplyKey).expect(201);
    firstApplyBody = record(created.body);
    v2 = String(record(firstApplyBody.operation).resultVersionId);
    expect(v2).not.toBe(v1);
    expect(record(firstApplyBody.dataset)).toMatchObject({ currentVersionId: v2, revision: 2 });
    expect((await apply(previewId, firstApplyKey).expect(201)).body).toEqual(firstApplyBody);
    await apply(previewId, randomUUID()).expect(409);
    const oldRows = await request(fixture.server).get(rowUrl(v1)).set('Authorization', auth()).expect(200);
    const newRows = await request(fixture.server).get(rowUrl(v2)).set('Authorization', auth()).expect(200);
    expect(record(record(record((record(oldRows.body).rows as unknown[])[0]).cells)[columns[0]])).toMatchObject({ value: 1 });
    expect(record(record(record((record(newRows.body).rows as unknown[])[0]).cells)[columns[0]])).toMatchObject({ value: 10 });
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId), kind: 'process' })).toBe(1);
    expect(await connection.db!.collection('datasetVersions').countDocuments({ datasetId: new Types.ObjectId(datasetId), state: 'published' })).toBe(2);
    const preview = await request(fixture.server).get(`${datasetUrl()}/previews/${previewId}`).set('Authorization', auth()).expect(200);
    expect(record(record(preview.body).preview).status).toBe('applied');
  });

  it('reads history and all five analysis endpoints only for the authorized owner', async () => {
    const history = await request(fixture.server).get(`${datasetUrl()}/operations`)
      .query({ page: 1, limit: 10 }).set('Authorization', auth()).expect(200);
    expect(record(history.body).total).toBe(2);
    expect((record(history.body).items as unknown[]).map(item => record(item).kind)).toEqual(['process', 'import']);
    const base = `${datasetUrl()}/versions/${v2}/analysis`;
    const summary = await request(fixture.server).get(`${base}/summary`).set('Authorization', auth()).expect(200);
    expect(record(summary.body)).toMatchObject({ rowCount: 3, columnCount: 4, missingCount: 0 });
    const dist = await request(fixture.server).get(`${base}/columns/${columns[0]}/distribution`)
      .query({ bins: 3 }).set('Authorization', auth()).expect(200);
    expect((record(dist.body).histogram as unknown[]).length).toBe(3);
    const correlation = await request(fixture.server).get(`${base}/correlation`).set('Authorization', auth()).expect(200);
    expect(record(correlation.body).matrix).toBeDefined();
    const points = await request(fixture.server).get(`${base}/points-3d`).query({ xColumnId: columns[0], yColumnId: columns[1], zColumnId: columns[2] })
      .set('Authorization', auth()).expect(200);
    expect((record(points.body).points as unknown[]).length).toBe(3);
    const counts = await request(fixture.server).get(`${base}/columns/${columns[3]}/value-counts`)
      .set('Authorization', auth()).expect(200);
    expect(record(counts.body).totalCategories).toBe(2);
    for (const route of [`${datasetUrl()}/operations`, `${base}/summary`, `${base}/points-3d`]) {
      await request(fixture.server).get(route).set('Authorization', foreign()).expect(403);
    }
    await request(fixture.server).get(`${base}/summary`).expect(401);
  });

  it('restores V1 by publishing V3, preserves V1/V2 and exact same-key response', async () => {
    const restoreKey = randomUUID();
    const endpoint = `${datasetUrl()}/versions/${v1}/restore`;
    const payload = { expectedCurrentVersionId: v2 };
    const created = await request(fixture.server).post(endpoint).set('Authorization', auth())
      .set('Idempotency-Key', restoreKey).send(payload).expect(201);
    const body = record(created.body);
    v3 = String(record(body.newVersion)._id);
    expect(record(body.newVersion)).toMatchObject({ versionNumber: 3, parentVersionId: v2, restoredFromVersionId: v1 });
    expect((await request(fixture.server).post(endpoint).set('Authorization', auth())
      .set('Idempotency-Key', restoreKey).send(payload).expect(201)).body).toEqual(created.body);
    const repo = fixture.app.get(DatasetsRepository);
    expect(await repo.snapshot(datasetId, v3)).toEqual(await repo.snapshot(datasetId, v1));
    expect(await repo.snapshot(datasetId, v2)).not.toEqual(await repo.snapshot(datasetId, v1));
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId) })).toBe(3);
    const storedRestore = await connection.db!.collection('processingOperations').findOne({ datasetId: new Types.ObjectId(datasetId), kind: 'restore' });
    expect(storedRestore?.specification?.targetVersionId).toBeInstanceOf(Types.ObjectId);
    expect((storedRestore?.specification?.targetVersionId as Types.ObjectId).toHexString()).toBe(v1);
    const history = await request(fixture.server).get(`${datasetUrl()}/operations`).query({ kind: 'restore' })
      .set('Authorization', auth()).expect(200);
    expect(record(history.body).total).toBe(1);
    const restoredOperation = record((record(history.body).items as unknown[])[0]);
    expect(record(restoredOperation.specification).targetVersionId).toBe(v1);
    await request(fixture.server).post(endpoint).set('Authorization', foreign())
      .set('Idempotency-Key', randomUUID()).send({ expectedCurrentVersionId: v3 }).expect(403);
  });

  it('stops offline replay on stale base and keeps failed operations out of history', async () => {
    const before = await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId) });
    const stale = await createPreview(specification(v1, 100), randomUUID()).expect(409);
    expect(record(record(stale.body).error).code).toBe('BASE_VERSION_STALE');
    const sameVersion = await request(fixture.server).post(`${datasetUrl()}/versions/${v3}/restore`)
      .set('Authorization', auth()).set('Idempotency-Key', randomUUID())
      .send({ expectedCurrentVersionId: v3 }).expect(409);
    expect(record(record(sameVersion.body).error).code).toBeDefined();
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId) })).toBe(before);
    expect((await connection.db!.collection('datasets').findOne({ _id: new Types.ObjectId(datasetId) }))!.currentVersionId!.toHexString()).toBe(v3);
  });

  it('concurrent Apply calls can publish at most one successor, never two', async () => {
    const p1 = record((await createPreview(specification(v3, 20)).expect(201)).body);
    const p2 = record((await createPreview(specification(v3, 30)).expect(201)).body);
    const responses = await Promise.all([apply(String(p1.previewId)), apply(String(p2.previewId))]);
    const committed = responses.filter(response => response.status === 201);
    expect(committed).toHaveLength(1);
    expect(responses.filter(response => response.status !== 201).every(response => [409, 503].includes(response.status))).toBe(true);
    expect(await connection.db!.collection('datasetVersions').countDocuments({ datasetId: new Types.ObjectId(datasetId), state: 'published' })).toBe(4);
    expect(await connection.db!.collection('processingOperations').countDocuments({ datasetId: new Types.ObjectId(datasetId), kind: 'process' })).toBe(2);
    const current = await connection.db!.collection('datasets').findOne({ _id: new Types.ObjectId(datasetId) });
    expect(current!.revision).toBe(4);
    expect(current!.currentVersionId!.toHexString()).toBe(String(record(record(committed[0].body).dataset).currentVersionId));
  });
});
