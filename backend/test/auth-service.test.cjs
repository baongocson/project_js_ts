const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { AuthService } = require('../dist/modules/auth/auth.service.js');
const { hashRefreshToken } = require('../dist/modules/auth/security/auth-crypto.js');

function fixture(enabled = true) {
  const users = new Map(); const sessions = new Map();
  const repo = {
    async createUser(email, passwordHash) {
      if (users.has(email)) throw Object.assign(new Error('duplicate key'), { code: 11000 });
      const now = new Date(); const user = { _id: new Types.ObjectId(), email, emailNormalized: email, passwordHash, displayName: null, preferences: { theme: 'system' }, lifecycle: 'active', writeEpoch: 0, createdAt: now, updatedAt: now };
      users.set(email, user); return user;
    },
    async findUserByEmail(email) { return users.get(email) ?? null; },
    async findUserById(id) { return [...users.values()].find(u => u._id.equals(id)) ?? null; },
    async createSession(userId, refreshTokenHash, expiresAt) {
      const now = new Date(); const session = { _id: new Types.ObjectId(), userId, refreshTokenHash, rotationCounter: 0, expiresAt, revokedAt: null, createdAt: now, lastUsedAt: now };
      sessions.set(session._id.toHexString(), session); return session;
    },
    async findActiveSessionByRefreshHash(hash) { return [...sessions.values()].find(s => s.refreshTokenHash === hash && !s.revokedAt && s.expiresAt > new Date()) ?? null; },
    async rotateSession(id, oldHash, newHash, expiresAt) {
      const s = sessions.get(id.toHexString());
      if (!s || s.refreshTokenHash !== oldHash || s.revokedAt || s.expiresAt <= new Date()) return null;
      s.refreshTokenHash = newHash; s.rotationCounter++; s.expiresAt = expiresAt; return s;
    },
    async revokeSessionByRefreshHash(hash) {
      const s = [...sessions.values()].find(s => s.refreshTokenHash === hash && !s.revokedAt);
      if (!s) return false; s.revokedAt = new Date(); return true;
    },
  };
  const config = { get(name) { return ({ DATABASE_ENABLED: enabled ? 'true' : 'false', AUTH_ACCESS_TOKEN_SECRET: 'this-test-only-access-token-secret-more-than-32-bytes', AUTH_TOKEN_ISSUER: 'dashboard-3d', AUTH_TOKEN_AUDIENCE: 'dashboard-3d-frontend' })[name]; }, getOrThrow(name) { if (name === 'FRONTEND_ORIGIN') return 'http://localhost:5173'; throw Error('unconfigured: ' + name); } };
  return { service: new AuthService(repo, config), users, sessions };
}
const origin = 'http://localhost:5173';

test('register hashes password using bcrypt 12, returns public projection and rejects duplicate email', async () => {
  const { service, users } = fixture();
  const first = await service.register({ email: 'a@example.com', password: 'long-password-12-characters' }, origin);
  assert.equal(first.user.email, 'a@example.com');
  assert.equal('passwordHash' in first.user, false);
  assert.match(users.get('a@example.com').passwordHash, /^\$2[aby]\$12\$/);
  await assert.rejects(() => service.register({ email: 'a@example.com', password: 'long-password-12-characters' }, origin), { status: 409 });
});

test('login issues token and session; refresh rotates once; old refresh and logout revoked cookie are rejected', async () => {
  const { service, sessions } = fixture();
  await service.register({ email: 'a@example.com', password: 'long-password-12-characters' }, origin);
  await assert.rejects(() => service.login({ email: 'a@example.com', password: 'wrong' }, origin), { status: 401 });
  const login = await service.login({ email: 'a@example.com', password: 'long-password-12-characters' }, origin);
  assert.equal(login.response.expiresIn, 900);
  assert.equal(login.response.accessToken.split('.').length, 3);
  assert.equal(sessions.size, 1);
  const session = [...sessions.values()][0];
  assert.equal(session.refreshTokenHash, hashRefreshToken(login.refreshToken));
  const firstExpiry = session.expiresAt.getTime();
  const rotated = await service.refresh(login.refreshToken, origin);
  assert.equal(session.rotationCounter, 1);
  assert.equal(session.expiresAt.getTime(), firstExpiry);
  await assert.rejects(() => service.refresh(login.refreshToken, origin), { status: 401 });
  await service.logout(rotated.refreshToken, origin);
  await service.logout(rotated.refreshToken, origin);
  await assert.rejects(() => service.refresh(rotated.refreshToken, origin), { status: 401 });
});

test('Origin check fails closed; Database disabled retains old 501 HTTP behavior', async () => {
  const { service } = fixture();
  await assert.rejects(() => service.register({ email: 'a@example.com', password: 'long-password-12-characters' }, undefined), { status: 403 });
  const disabled = fixture(false).service;
  await assert.rejects(() => disabled.register({ email: 'a@example.com', password: 'long-password-12-characters' }, undefined), { status: 501 });
});
