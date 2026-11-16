import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createTestApp, record } from '../../../utils';
import { AccountCleanupService } from '../../../../infrastructure/database/account-cleanup.service';
import { AuthRepository } from '../../../../modules/auth/auth.repository';
import { issueAccessToken } from '../../../../modules/auth/security/auth-crypto';
import { tokenSettings } from '../../../../modules/auth/security/token-settings';
import { ownedFixture } from './owned-fixture';
import { PROJECT_ROOT } from '../../../../infrastructure/database/database.connection';
import { resolve } from 'node:path';
import { access as fileAccess } from 'node:fs/promises';
import { OwnershipService } from '../../../../modules/auth/security/ownership.service';

jest.setTimeout(120_000);
describe('BE-1 HTTP + real MongoDB (no auth/ownership overrides)', () => {
  let fixture: Awaited<ReturnType<typeof createTestApp>>, connection: Connection, origin: string;
  const run = randomUUID();
  const email = `be1-${run}@example.com`, otherEmail = `be1-other-${run}@example.com`;
  const password = ' test-password-123 ';
  const users: Types.ObjectId[] = [];
  let userId: string, otherId: string, access: string, cookie: string, projectId: Types.ObjectId;
  let graph: Awaited<ReturnType<typeof ownedFixture>>;
  function extractCookie(headers: Record<string, unknown>): string {
    const values = headers['set-cookie'];
    if (!Array.isArray(values) || typeof values[0] !== 'string') throw new Error('Missing refresh cookie');
    expect(values[0]).toContain('HttpOnly'); expect(values[0]).toContain('Secure'); expect(values[0]).toContain('SameSite=Lax'); expect(values[0]).toContain('Path=/api/v1/auth');
    return values[0].split(';')[0];
  }
  async function login(account = email) {
    const response = await request(fixture.server).post('/api/v1/auth/login').set('Origin', origin).send({ email: account, password }).expect(200);
    const token = record(response.body).accessToken;
    if (typeof token !== 'string') throw new Error('Missing access token');
    return { token, cookie: extractCookie(response.headers), response };
  }
  beforeAll(async () => {
    fixture = await createTestApp(true);
    connection = fixture.app.get<Connection>(getConnectionToken());
    origin = fixture.app.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN').split(',')[0].trim();
    fixture.app.get(ConfigService).set('ORIGINAL_STORAGE_ROOT', resolve(PROJECT_ROOT, 'backend/storage/originals'));
  });
  afterAll(async () => {
    if (connection?.db && fixture) {
      // Also recover users created before an assertion failed. Never query other runs' accounts.
      for await (const user of connection.db.collection('users').find({ emailNormalized: { $in: [email, otherEmail] } })) {
        if (!users.some(id => id.equals(user._id))) users.push(user._id);
      }
      const cleanup = fixture.app.get(AccountCleanupService);
      for (const id of users) { await cleanup.markUserDeleting(id); await cleanup.removeUser(id); }
    }
    await fixture?.close();
  });
  it('registers a projected user with bcrypt and rejects duplicate email', async () => {
    const response = await request(fixture.server).post('/api/v1/auth/register').set('Origin', origin).send({ email: email.toUpperCase(), password }).expect(201);
    const user = record(record(response.body).user);
    userId = String(user._id); users.push(new Types.ObjectId(userId));
    expect(user).toMatchObject({ email, displayName: null, preferences: { theme: 'system' } });
    expect(Object.keys(user).sort()).toEqual(['_id', 'createdAt', 'displayName', 'email', 'preferences']);
    const stored = await connection.db!.collection('users').findOne({ _id: new Types.ObjectId(userId) });
    expect(stored?.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    await request(fixture.server).post('/api/v1/auth/register').set('Origin', origin).send({ email, password }).expect(409);
    const other = await request(fixture.server).post('/api/v1/auth/register').set('Origin', origin).send({ email: otherEmail, password }).expect(201);
    otherId = String(record(record(other.body).user)._id); users.push(new Types.ObjectId(otherId));
  });
  it('rejects hostile Origin and invalid credentials without leaking which field was wrong', async () => {
    await request(fixture.server).post('/api/v1/auth/login').set('Origin', 'https://hostile.example').send({ email, password }).expect(403);
    const bad = await request(fixture.server).post('/api/v1/auth/login').set('Origin', origin).send({ email, password: 'wrong' }).expect(401);
    const unknown = await request(fixture.server).post('/api/v1/auth/login').set('Origin', origin).send({ email: `unknown-${run}@example.com`, password }).expect(401);
    expect(record(record(bad.body).error).code).toBe(record(record(unknown.body).error).code);
  });
  it('logs in, stores only a refresh hash, and serves/patches the current user', async () => {
    const result = await login(); access = result.token; cookie = result.cookie;
    expect(record(result.response.body).expiresIn).toBe(900);
    const session = await connection.db!.collection('authSessions').findOne({ userId: new Types.ObjectId(userId) });
    expect(session?.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session?.refreshTokenHash).not.toBe(cookie.split('=')[1]);
    const me = await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${access}`).expect(200);
    expect(record(me.body).email).toBe(email);
    expect(Object.keys(record(me.body)).sort()).toEqual(['_id', 'createdAt', 'displayName', 'email', 'preferences', 'updatedAt']);
    const patched = await request(fixture.server).patch('/api/v1/users/me').set('Authorization', `Bearer ${access}`).send({ displayName: '  Nhóm 3D  ', preferences: { theme: 'dark' } }).expect(200);
    expect(record(patched.body)).toMatchObject({ displayName: 'Nhóm 3D', preferences: { theme: 'dark' } });
    expect(record(patched.body).email).toBeUndefined();
    await request(fixture.server).patch('/api/v1/users/me').set('Authorization', `Bearer ${access}`).send({ displayName: null }).expect(200);
    await request(fixture.server).patch('/api/v1/users/me').set('Authorization', `Bearer ${access}`).send({}).expect(400);
  });
  it('rotates refresh atomically with one winner and preserves absolute expiry', async () => {
    const before = await connection.db!.collection('authSessions').findOne({ userId: new Types.ObjectId(userId), revokedAt: null });
    const responses = await Promise.all([0, 1].map(() => request(fixture.server).post('/api/v1/auth/refresh').set('Origin', origin).set('Cookie', cookie).send({})));
    expect(responses.map(r => r.status).sort()).toEqual([200, 401]);
    const success = responses.find(r => r.status === 200)!;
    const old = cookie; cookie = extractCookie(success.headers); access = String(record(success.body).accessToken);
    expect(cookie).not.toBe(old);
    await request(fixture.server).post('/api/v1/auth/refresh').set('Origin', origin).set('Cookie', old).send({}).expect(401);
    const after = await connection.db!.collection('authSessions').findOne({ _id: before!._id });
    expect(after?.expiresAt).toEqual(before?.expiresAt);
    expect(after?.rotationCounter).toBe(1);
  });
  it('checks authentication before ID syntax, and ownership before unimplemented services', async () => {
    const db = connection.db!, now = new Date(); projectId = new Types.ObjectId();
    await db.collection('projects').insertOne({ _id: projectId, ownerId: new Types.ObjectId(userId), name: 'BE1 test', lifecycle: 'empty', writeEpoch: 0, createdAt: now, updatedAt: now });
    await request(fixture.server).get('/api/v1/projects/invalid').expect(401);
    await request(fixture.server).get('/api/v1/projects/invalid').set('Authorization', `Bearer ${access}`).expect(400);
    await request(fixture.server).get(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${access}`).expect(501);
    const other = await login(otherEmail);
    await request(fixture.server).get(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${other.token}`).expect(403);
    await request(fixture.server).get(`/api/v1/projects/${new Types.ObjectId()}`).set('Authorization', `Bearer ${access}`).expect(404);
    await db.collection('projects').updateOne({ _id: projectId }, { $set: { lifecycle: 'deleting' } });
    await request(fixture.server).get(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${access}`).expect(404);
    await request(fixture.server).patch(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${access}`).send({ name: 'x' }).expect(409);
  });
  it('rejects expired access/session and revokes access immediately on logout', async () => {
    const repo = fixture.app.get(AuthRepository), user = new Types.ObjectId(userId);
    const session = await connection.db!.collection('authSessions').findOne({ userId: user, revokedAt: null });
    const expired = issueAccessToken(userId, session!._id.toHexString(), tokenSettings(fixture.app.get(ConfigService)), Math.floor(Date.now() / 1000) - 901);
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${expired.accessToken}`).expect(401);
    await connection.db!.collection('authSessions').updateOne({ _id: session!._id }, { $set: { expiresAt: new Date(0) } });
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${access}`).expect(401);
    expect(await repo.findActiveSessionById(session!._id)).toBeNull();
    const result = await login(); access = result.token; cookie = result.cookie;
    const loggedOut = await request(fixture.server).post('/api/v1/auth/logout').set('Origin', origin).set('Cookie', cookie).send({}).expect(204);
    expect(loggedOut.text).toBe('');
    expect(String(loggedOut.headers['set-cookie'])).toContain('Path=/api/v1/auth');
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${access}`).expect(401);
    await request(fixture.server).post('/api/v1/auth/refresh').set('Origin', origin).set('Cookie', cookie).send({}).expect(401);
    await request(fixture.server).post('/api/v1/auth/logout').set('Origin', origin).send({}).expect(204);
  });
  it('enforces dataset/version/preview relationships and rechecks session in write fences', async () => {
    const result = await login(); access = result.token; cookie = result.cookie;
    graph = await ownedFixture(connection, new Types.ObjectId(userId), resolve(PROJECT_ROOT, 'backend/storage/originals'));
    const prefix = `/api/v1/datasets/${graph.datasetId}`;
    await request(fixture.server).get(`${prefix}/versions/${graph.versionId}`).set('Authorization', `Bearer ${access}`).expect(501);
    const other = await login(otherEmail);
    await request(fixture.server).get(`${prefix}/versions/${graph.versionId}`).set('Authorization', `Bearer ${other.token}`).expect(403);
    await request(fixture.server).get(`${prefix}/versions/${new Types.ObjectId()}`).set('Authorization', `Bearer ${access}`).expect(404);
    await request(fixture.server).post(`${prefix}/operations`).set('Authorization', `Bearer ${access}`).set('Idempotency-Key', 'test').send({ previewId: new Types.ObjectId().toHexString() }).expect(404);
    await connection.db!.collection('datasetVersions').updateOne({ _id: graph.versionId }, { $set: { state: 'staged' } });
    await request(fixture.server).get(`${prefix}/versions/${graph.versionId}`).set('Authorization', `Bearer ${access}`).expect(404);
    await connection.db!.collection('datasetVersions').updateOne({ _id: graph.versionId }, { $set: { state: 'published' } });
    // Use the signed token's own sid, not a user-supplied identity.
    const payload = JSON.parse(Buffer.from(access.split('.')[1], 'base64url').toString()) as { sid: string };
    const future = new Date(Date.now() + 60_000);
    await connection.db!.collection('authSessions').updateOne({ _id: new Types.ObjectId(payload.sid) }, { $set: { lastUsedAt: future } });
    const activeWrite = await connection.startSession();
    try {
      await activeWrite.withTransaction(() => fixture.app.get(OwnershipService).fence({ userId, sessionId: payload.sid }, graph.projectId.toHexString(), activeWrite));
    } finally { await activeWrite.endSession(); }
    const touched = await connection.db!.collection('authSessions').findOne({ _id: new Types.ObjectId(payload.sid) });
    expect((touched!.lastUsedAt as Date).getTime()).toBeGreaterThan(future.getTime());
    await request(fixture.server).post('/api/v1/auth/logout').set('Origin', origin).set('Cookie', cookie).send({}).expect(204);
    const transaction = await connection.startSession();
    try {
      await expect(transaction.withTransaction(() => fixture.app.get(OwnershipService).fence({ userId, sessionId: payload.sid }, graph.projectId.toHexString(), transaction))).rejects.toMatchObject({ status: 401 });
    } finally { await transaction.endSession(); }
  });
  it('deletes an account and its sessions/projects without deleting another user', async () => {
    const result = await login(); access = result.token;
    await request(fixture.server).delete('/api/v1/users/me').set('Authorization', `Bearer ${access}`).send({}).expect(204);
    expect(await connection.db!.collection('users').findOne({ _id: new Types.ObjectId(userId) })).toBeNull();
    expect(await connection.db!.collection('authSessions').countDocuments({ userId: new Types.ObjectId(userId) })).toBe(0);
    expect(await connection.db!.collection('projects').countDocuments({ ownerId: new Types.ObjectId(userId) })).toBe(0);
    expect(await connection.db!.collection('users').findOne({ _id: new Types.ObjectId(otherId) })).not.toBeNull();
    for (const [collection, document] of Object.entries(graph.documents)) {
      expect(await connection.db!.collection(collection).findOne({ _id: document._id })).toBeNull();
    }
    await expect(fileAccess(graph.sourcePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${access}`).expect(401);
  });
  it('returns 503 on incomplete cleanup, keeps the deleting marker and resumes safely', async () => {
    const result = await login(otherEmail);
    const unfinished = await ownedFixture(connection, new Types.ObjectId(otherId), resolve(PROJECT_ROOT, 'backend/storage/originals'));
    const dataset = unfinished.documents.datasets;
    const original = record(dataset.originalFile);
    await connection.db!.collection('datasets').updateOne({ _id: unfinished.datasetId }, { $set: { 'originalFile.storageKey': '../outside.csv' } });
    await request(fixture.server).delete('/api/v1/users/me').set('Authorization', `Bearer ${result.token}`).send({}).expect(503);
    expect(await connection.db!.collection('users').findOne({ _id: new Types.ObjectId(otherId) })).toMatchObject({ lifecycle: 'deleting' });
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', `Bearer ${result.token}`).expect(401);
    await connection.db!.collection('datasets').updateOne({ _id: unfinished.datasetId }, { $set: { 'originalFile.storageKey': original.storageKey } });
    const config = fixture.app.get(ConfigService);
    const restartedCleanup = new AccountCleanupService(config, connection);
    try {
      // Fresh service instance proves recovery uses durable markers, without sweeping unrelated accounts.
      await restartedCleanup.removeUser(new Types.ObjectId(otherId));
    } finally {
      await restartedCleanup.onModuleDestroy();
    }
    for (const [collection, document] of Object.entries(unfinished.documents)) {
      expect(await connection.db!.collection(collection).findOne({ _id: document._id })).toBeNull();
    }
    expect(await connection.db!.collection('users').findOne({ _id: new Types.ObjectId(otherId) })).toBeNull();
    await expect(fileAccess(unfinished.sourcePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
