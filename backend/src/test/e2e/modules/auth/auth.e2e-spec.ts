import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createTestApp, record } from '../../../utils';
describe('Auth (E2E — HTTP contracts of the main scaffold)', () => {
    let fixture: Awaited<ReturnType<typeof createTestApp>>;
    beforeAll(async () => { fixture = await createTestApp(); });
    afterAll(async () => { await fixture?.close(); });
    it('returns 501 for valid registration while authentication is unimplemented', async () => {
        const response = await request(fixture.server).post('/api/v1/auth/register').send({ email: 'test@example.com', password: 'abcdefghijkl' }).expect(501);
        expect(record(record(response.body).error).code).toBe('NOT_IMPLEMENTED');
    });
    it('rejects invalid registration input before reaching the service', async () => {
        const response = await request(fixture.server).post('/api/v1/auth/register').send({ email: 'invalid-email', password: 'short' }).expect(400);
        expect(record(record(response.body).error).code).toBe('VALIDATION_ERROR');
    });
    it('rejects unknown query fields', async () => {
        await request(fixture.server).post('/api/v1/auth/login?unexpected=1').send({ email: 'test@example.com', password: 'x' }).expect(400);
    });
});
