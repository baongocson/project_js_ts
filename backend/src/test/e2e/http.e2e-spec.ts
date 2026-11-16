import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import { createTestApp, http, record, type HttpMethod } from '../utils';
type Case = readonly [
    HttpMethod,
    string,
    unknown?
];
describe('HTTP DTO contracts (explicit security overrides, database disabled)', () => {
    let fixture: Awaited<ReturnType<typeof createTestApp>>;
    beforeAll(async () => { fixture = await createTestApp(false, true); });
    afterAll(async () => { await fixture?.close(); });
    const id = '0123456789abcdef01234567', uuid = '00000000-0000-4000-8000-000000000001';
    const root = 'datasets/' + id + '/versions/' + id;
    const cases: Case[] = [
        ['POST', 'auth/register', { email: 'a@example.com', password: 'abcdefghijkl' }], ['POST', 'auth/login', { email: 'a@example.com', password: 'x' }], ['POST', 'auth/refresh', {}], ['POST', 'auth/logout', {}],
        ['GET', 'users/me'], ['PATCH', 'users/me', { displayName: null }], ['DELETE', 'users/me'],
        ['POST', 'projects', { name: 'Project' }], ['GET', 'projects?sort=name'], ['GET', 'projects/' + id], ['PATCH', 'projects/' + id, { name: 'Renamed' }], ['PATCH', 'projects/' + id + '/workspace', { revision: 1, boundVersionId: null, tableState: { page: 1 } }], ['DELETE', 'projects/' + id],
        ['POST', 'projects/' + id + '/datasets', { importOptions: {} }], ['GET', root], ['GET', root + '/rows'], ['GET', root + '/rows/' + uuid],
        ['GET', root + '/analysis/summary'], ['GET', root + '/analysis/columns/' + uuid + '/distribution'], ['GET', root + '/analysis/correlation'], ['GET', root + '/analysis/points-3d?xColumnId=' + uuid + '&yColumnId=' + uuid + '&zColumnId=' + uuid], ['GET', root + '/analysis/columns/' + uuid + '/value-counts'],
        ['POST', 'datasets/' + id + '/previews', { baseVersionId: id, specification: { method: 'edit_cell', parameters: { value: { kind: 'null', value: null } }, scope: { type: 'cell', rowId: uuid, columnId: uuid } } }], ['GET', 'datasets/' + id + '/previews/' + id], ['POST', 'datasets/' + id + '/operations', { previewId: id }],
        ['GET', 'datasets/' + id + '/operations'], ['POST', root + '/restore', { expectedCurrentVersionId: id }],
    ];
    it.each(cases.map(([method, route, body]) => [method, route, body] as const))('%s %s validates its contract with database disabled', async (method, route, body) => {
        const query = http(fixture.server, method, '/api/v1/' + route).set('Content-Type', 'application/json').set('Idempotency-Key', 'test-key');
        if (body !== undefined)
            query.send(JSON.stringify(body));
        const response = await query;
        const be2 = route.startsWith('projects') || (route.startsWith('datasets') && !route.includes('/analysis/') && !route.includes('/restore') && !route.includes('/previews') && !route.includes('/operations'));
        expect(response.status).toBe(be2 ? 503 : 501);
        expect(record(record(response.body).error).code).toBe(be2 ? 'DATABASE_UNAVAILABLE' : 'NOT_IMPLEMENTED');
    });
    const invalid: readonly [
        HttpMethod,
        string,
        unknown,
        string
    ][] = [
        ['POST', 'auth/register', { email: 'tên@example.com', password: 'abcdefghijkl' }, 'VALIDATION_ERROR'],
        ['PATCH', 'users/me', { preferences: {} }, 'EMPTY_PATCH'],
        ['PATCH', 'projects/' + id + '/workspace', { revision: 1, boundVersionId: null }, 'EMPTY_PATCH'],
        ['POST', 'datasets/' + id + '/operations', { previewId: id, parameters: {} }, 'VALIDATION_ERROR'],
        ['GET', 'projects?page=1&page=2', undefined, 'VALIDATION_ERROR'],
        ['GET', 'users/me?unexpected=1', undefined, 'VALIDATION_ERROR'],
        ['POST', 'projects?unexpected=1', { name: 'Project' }, 'VALIDATION_ERROR'],
        ['GET', root + '/analysis/summary?threshold=3', undefined, 'VALIDATION_ERROR'],
        ['GET', root + '/analysis/correlation?method=category', undefined, 'VALIDATION_ERROR'],
    ];
    it.each(invalid)('%s %s rejects invalid DTO or query', async (method, route, body, code) => {
        const query = http(fixture.server, method, '/api/v1/' + route).set('Content-Type', 'application/json').set('Idempotency-Key', 'test-key');
        if (body !== undefined)
            query.send(JSON.stringify(body));
        const response = await query;
        expect(response.status).toBe(400);
        expect(record(record(response.body).error).code).toBe(code);
    });
    it('requires the idempotency header for project creation', async () => {
        const response = await http(fixture.server, 'POST', '/api/v1/projects').send({ name: 'Project' });
        expect(response.status).toBe(400);
    });
    it('accepts JSON above the Express default 100 KiB and enforces the specified 1 MiB limit', async () => {
        const within = await http(fixture.server, 'POST', '/api/v1/projects').set('Idempotency-Key', 'json-boundary').send({ name: 'x'.repeat(150_000) });
        expect(within.status).toBe(400); // DTO name validation, not a transport-size rejection.
        const above = await http(fixture.server, 'POST', '/api/v1/projects').set('Idempotency-Key', 'json-boundary').send({ name: 'x'.repeat(1024 * 1024) });
        expect(above.status).toBe(413);
        expect(record(record(above.body).error).code).toBe('LIMIT_EXCEEDED');
    });
});
