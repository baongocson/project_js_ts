import { beforeAll, afterAll, describe, it, expect, jest } from '@jest/globals';
import { getConnectionToken } from '@nestjs/mongoose';
import { type Connection } from 'mongoose';
import request from 'supertest';
import { createTestApp, record } from '../../../utils';
jest.setTimeout(120000);
describe('Database health (integration with Atlas)', () => {
    let fixture: Awaited<ReturnType<typeof createTestApp>>;
    beforeAll(async () => { fixture = await createTestApp(true); });
    afterAll(async () => { await fixture?.close(); });
    it('pings the database and reports a disconnected connection', async () => {
        const connected = await request(fixture.server).get('/api/v1/health').expect(200);
        expect(record(connected.body).database).toBe('connected');
        await fixture.app.get<Connection>(getConnectionToken()).close();
        await request(fixture.server).get('/api/v1/health').expect(503);
    });
});
