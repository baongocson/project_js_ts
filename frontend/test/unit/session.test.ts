import { test } from 'node:test';
import assert from 'node:assert/strict';

Object.defineProperty(globalThis, 'BroadcastChannel', { value: undefined, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, locks: { request: async (_name: string, callback: () => Promise<unknown>) => callback() } }, configurable: true });
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } });
const { session } = await import('../../src/features/auth/hooks/session');
const { requestJson } = await import('../../src/shared/api/http-client');
const user = { _id: 'user1', email: 'user@example.com', displayName: null, preferences: { theme: 'system' } };

void test('concurrent 401s share one refresh and logout fences an in-flight refresh', async () => {
  let refreshCount = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('auth/login')) return Response.json({ user, accessToken: 'old', expiresIn: 900 });
    if (String(url).endsWith('auth/refresh')) { refreshCount++; await new Promise(resolve => setTimeout(resolve, 10)); return Response.json({ accessToken: 'new', expiresIn: 900 }); }
    return new Headers(init?.headers).get('Authorization') === 'Bearer old' ? new Response('{}', { status: 401 }) : Response.json(user);
  };
  await session.login({ email: user.email, password: 'password-long-enough' });
  await Promise.all([requestJson('users/me'), requestJson('users/me'), requestJson('users/me')]);
  assert.equal(refreshCount, 1);
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = new Promise<void>(resolve => { release = resolve; });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('auth/refresh')) { entered(); await pending; return Response.json({ accessToken: 'late', expiresIn: 900 }); }
    return new Response('{}', { status: 401 });
  };
  const request = requestJson('users/me');
  await started; await session.logout(true); release();
  await assert.rejects(request, /Phiên đã thay đổi/);
  assert.equal(session.getSnapshot().status, 'anonymous');
});
void test('offline logout suppresses cookie bootstrap until an explicit login', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}'); };
  await session.bootstrap();
  assert.equal(calls, 0);
  assert.equal(session.getSnapshot().user, null);
});
void test('refresh rejection clears user and in-memory access token', async () => {
  globalThis.fetch = async () => Response.json({ user, accessToken: 'old', expiresIn: 900 });
  await session.login({ email: user.email, password: 'password-long-enough' });
  let requestsWithBearer = 0;
  globalThis.fetch = async (_url, init) => {
    if (new Headers(init?.headers).has('Authorization')) requestsWithBearer++;
    return Response.json({ error: { code: 'AUTH_REFRESH_INVALID', message: 'Phiên hết hạn' } }, { status: 401 });
  };
  await assert.rejects(requestJson('users/me'), /Phiên hết hạn/);
  assert.equal(session.getSnapshot().user, null);
  assert.equal(session.getSnapshot().status, 'anonymous');
  assert.equal(requestsWithBearer, 1);
  requestsWithBearer = 0;
  await assert.rejects(requestJson('users/me'), /Phiên hết hạn/);
  assert.equal(requestsWithBearer, 0);
});

void test('a late successful account deletion cannot clear a newly signed-in account', async () => {
  const other = { ...user, _id: 'user2', email: 'other@example.com' };
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'DELETE') { entered(); await held; return new Response(null, { status: 204 }); }
    const email = JSON.parse(String(init?.body)).email as string;
    return Response.json({ user: email === user.email ? user : other, accessToken: email, expiresIn: 900 });
  };
  await session.login({ email: user.email, password: 'password-long-enough' });
  const deletion = session.deleteAccount(); await started;
  await session.login({ email: other.email, password: 'password-long-enough' });
  release(); await deletion;
  assert.equal(session.getSnapshot().user?._id, other._id);
  assert.equal(session.accessToken(), other.email);
});

void test('logout waiting for the cookie lock does not revoke a later login', async () => {
  let release!: () => void, entered!: () => void, hold = false, logoutCalls = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const originalLocks = navigator.locks;
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, work: () => Promise<unknown>) => {
    if (hold) { hold = false; entered(); await held; } return work();
  } } });
  globalThis.fetch = async url => {
    if (String(url).endsWith('auth/logout')) { logoutCalls++; return new Response(null, { status: 204 }); }
    return Response.json({ user, accessToken: 'latest', expiresIn: 900 });
  };
  try {
    await session.login({ email: user.email, password: 'password-long-enough' });
    hold = true; const ending = session.logout();
    // Attach rejection handling before releasing the held logout.
    const rejected = assert.rejects(ending, /Phiên đã thay đổi/);
    await started; await session.login({ email: user.email, password: 'password-long-enough' });
    release(); await rejected;
    assert.equal(logoutCalls, 0);
    assert.equal(session.getSnapshot().user?._id, user._id);
  } finally { Object.defineProperty(navigator, 'locks', { configurable: true, value: originalLocks }); }
});
