import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createTestApp, record } from '../../../utils';

describe('Real global guards with database disabled (no overrides)', () => {
  let fixture: Awaited<ReturnType<typeof createTestApp>>;
  beforeAll(async () => { fixture = await createTestApp(); });
  afterAll(async () => { await fixture.close(); });
  it('keeps health public', async () => { await request(fixture.server).get('/api/v1/health').expect(200); });
  it.each(['/users/me', '/projects', '/projects/not-an-id', '/datasets/not-an-id/versions/bad'])('requires auth before ID validation: %s', async route => {
    const response = await request(fixture.server).get('/api/v1' + route).expect(401);
    expect(record(record(response.body).error).code).toBe('SESSION_INVALID');
  });
  it('does not accept a forged bearer token', async () => {
    await request(fixture.server).get('/api/v1/users/me').set('Authorization', 'Bearer a.b.c').expect(401);
  });
  it('requires authentication for AI suggestions before body or ID validation', async () => {
    const route = '/api/v1/datasets/not-an-id/versions/bad/ai/suggestions';
    const response = await request(fixture.server).post(route).send({ group: 'invalid' }).expect(401);
    expect(record(record(response.body).error).code).toBe('SESSION_INVALID');
    await request(fixture.server).post(route).set('Authorization', 'Bearer a.b.c').send({}).expect(401);
  });
  it('rejects absent and hostile Origin on auth before validation', async () => {
    await request(fixture.server).post('/api/v1/auth/login').send({}).expect(403);
    await request(fixture.server).post('/api/v1/auth/register').set('Origin', 'https://hostile.example').send({}).expect(403);
  });
  it('rate limits requests even when the database is disabled', async () => {
    const origin = 'http://localhost:5173';
    for (let index = 0; index < 10; index++) {
      await request(fixture.server).post('/api/v1/auth/register').set('Origin', origin).send({}).expect(400);
    }
    const response = await request(fixture.server).post('/api/v1/auth/register').set('Origin', origin).send({}).expect(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(record(record(response.body).error).code).toBe('RATE_LIMITED');
  });
});
