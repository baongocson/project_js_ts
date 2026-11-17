import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, NetworkError, configureAuthTransport, requestJson } from '../../src/shared/api/http-client';

void test('error envelope, Retry-After, non-JSON proxy failures and 204', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'STALE', message: 'Phiên bản cũ', details: { revision: 4 }, requestId: 'r1' } }), { status: 409, headers: { 'Retry-After': '3' } });
  await assert.rejects(requestJson('projects', { auth: false }), (error: unknown) => error instanceof ApiError
    && error.status === 409 && error.code === 'STALE' && error.requestId === 'r1' && error.retryAfter === 3000);
  globalThis.fetch = async () => new Response('proxy unavailable', { status: 503 });
  await assert.rejects(requestJson('health', { auth: false }), /API trả mã 503/);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await requestJson('auth/logout', { auth: false }), undefined);
});

void test('account change during a rejected request cannot replay its mutation as the new user',async()=>{
  let owner='A',token='A-token',calls=0;
  configureAuthTransport({token:()=>token,owner:()=>owner,refresh:async()=>{token='B-token';owner='B';}});
  globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
  await assert.rejects(requestJson('projects',{method:'POST',json:{name:'Owned by A'},headers:{'Idempotency-Key':'same-logical-request'}}),
    (error:unknown)=>error instanceof ApiError&&error.code==='ACCOUNT_MISMATCH');
  assert.equal(calls,1);
});
void test('multipart boundary, cancellation and network error remain distinct', async () => {
  const body = new FormData(); body.append('file', new Blob(['a,b']), 'test.csv');
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).has('Content-Type'), false);
    assert.equal(init?.body, body);
    return new Response('{}');
  };
  await requestJson('upload', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, auth: false });
  globalThis.fetch = async () => { throw new TypeError('failed'); };
  await assert.rejects(requestJson('health'), NetworkError);
  const controller = new AbortController(); controller.abort();
  globalThis.fetch = async () => { throw controller.signal.reason; };
  await assert.rejects(requestJson('health', { signal: controller.signal }), (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
});
void test('401 refresh replays safe/keyed calls once, preserves key and never blindly repeats a mutation', async () => {
  let token = 'old', refreshCount = 0, calls = 0;
  configureAuthTransport({ token: () => token, refresh: async () => { refreshCount++; token = 'new'; } });
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'permanent-key');
    return new Headers(init?.headers).get('Authorization') === 'Bearer old' ? new Response('{}', { status: 401 }) : new Response('{}');
  };
  await requestJson('projects', { method: 'POST', json: { name: 'A' }, headers: { 'Idempotency-Key': 'permanent-key' } });
  assert.equal(calls, 2); assert.equal(refreshCount, 1);
  calls = 0; token = 'old';
  globalThis.fetch = async () => { calls++; return new Response('{}', { status: 401 }); };
  await assert.rejects(requestJson('users/me', { method: 'DELETE' }), ApiError);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(requestJson('projects'), ApiError);
  assert.equal(calls, 2);
  await assert.rejects(requestJson('https://hostile.example/steal'), /Đường dẫn API/);
  calls = 0;
  configureAuthTransport({ token: () => 'B-token', owner: () => 'B', refresh: async () => {} });
  await assert.rejects(requestJson('projects', { expectedUserId: 'A' }), (error: unknown) => error instanceof ApiError && error.code === 'ACCOUNT_MISMATCH');
  assert.equal(calls, 0);
});
