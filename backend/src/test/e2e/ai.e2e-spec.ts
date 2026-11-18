import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { AiService } from '../../modules/ai/ai.service';
import { createTestApp } from '../utils';

describe('AI HTTP DTO/response contract (explicit security overrides)', () => {
  let fixture: Awaited<ReturnType<typeof createTestApp>>;
  const id = '0123456789abcdef01234567', column = '00000000-0000-4000-8000-000000000001';
  const route = `/api/v1/datasets/${id}/versions/${id}/ai/suggestions`;
  beforeAll(async () => { fixture = await createTestApp(false, true); });
  afterAll(async () => { await fixture.close(); });
  it('invalid DTO fails without calling the service', async () => {
    const spy = jest.spyOn(fixture.app.get(AiService), 'suggest');
    try {
      for (const body of [{}, { group: 'history' }, { group: 'cleaning', model: 'cloud' }, { group: 'cleaning', columnIds: [column] }, { group: 'cleaning', batch: -1 }]) await request(fixture.server).post(route).send(body).expect(400);
      await request(fixture.server).post(`${route}?model=cloud`).send({ group: 'cleaning' }).expect(400);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it('exposes the bound version response with no idempotency key required', async () => {
    const data = { versionId: id, group: 'cleaning', columnIds: [column], model: 'qwen3:4b', generatedAt: new Date().toISOString(), rowCount: 0, columnCount: 1, candidateCount: 0, reviewedCandidateCount: 0, batch: 0, totalBatches: 1, nextBatch: null, suggestions: [] };
    const spy = jest.spyOn(fixture.app.get(AiService), 'suggest').mockResolvedValue(data as never);
    try {
      const response = await request(fixture.server).post(route).send({ group: 'cleaning' }).expect(201);
      expect(response.body).toEqual(data); expect(spy.mock.calls[0].slice(1, 4)).toEqual([id, id, { group: 'cleaning', batch: 0 }]);
    } finally { spy.mockRestore(); }
  });
});
