const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const { AuthRepository } = require('../dist/modules/auth/repositories/auth.repository.js');
const oid = new Types.ObjectId();

function repoWith(collections) {
  return new AuthRepository({ db: { collection: (name) => {
    assert.ok(['users', 'authSessions'].includes(name), 'Only the two declared auth collections may be used');
    return collections[name];
  } } });
}

test('createUser writes exact ERD fields, never plain password', async () => {
  let user;
  const repo = repoWith({ users: { insertOne: async doc => { user = doc; } } });
  const result = await repo.createUser('test@example.com', 'scrypt-v1$opaque$hash', new Date('2026-11-15T00:00:00Z'));
  assert.equal(result, user);
  assert.equal(user.emailNormalized, 'test@example.com');
  assert.equal(user.lifecycle, 'active');
  assert.equal(user.writeEpoch, 0);
  assert.equal(user.preferences.theme, 'system');
  assert.equal(user.displayName, null);
  assert.equal('password' in user, false);
  assert.equal(user.passwordHash, 'scrypt-v1$opaque$hash');
});

test('refresh lookup requires not revoked and not expired', async () => {
  let filter;
  const repo = repoWith({ authSessions: { findOne: async value => { filter = value; return null; } } });
  const at = new Date('2026-11-15T00:00:00Z');
  await repo.findActiveSessionByRefreshHash('abc', at);
  assert.deepEqual(filter, { refreshTokenHash: 'abc', revokedAt: null, expiresAt: { $gt: at } });
});

test('refresh rotation is atomic compare-and-swap, increments exactly once', async () => {
  let request;
  const repo = repoWith({ authSessions: { findOneAndUpdate: async (...args) => { request = args; return null; } } });
  const at = new Date('2026-11-15T00:00:00Z');
  const expires = new Date('2026-11-22T00:00:00Z');
  await repo.rotateSession(oid, 'old-digest', 'new-digest', expires, at);
  assert.deepEqual(request[0], { _id: oid, refreshTokenHash: 'old-digest', revokedAt: null, expiresAt: { $gt: at } });
  assert.deepEqual(request[1], { $set: { refreshTokenHash: 'new-digest', expiresAt: expires, lastUsedAt: at }, $inc: { rotationCounter: 1 } });
  assert.deepEqual(request[2], { returnDocument: 'after' });
});

test('logout revokes token hash, does not delete audit session', async () => {
  let filter, update;
  const repo = repoWith({ authSessions: { updateOne: async (f, u) => { filter=f; update=u; return { modifiedCount: 1 }; } } });
  const at = new Date('2026-11-15T00:00:00Z');
  assert.equal(await repo.revokeSessionByRefreshHash('hashed-token',at), true);
  assert.deepEqual(filter, { refreshTokenHash:'hashed-token', revokedAt:null });
  assert.deepEqual(update, { $set:{revokedAt:at} });
});

test('DB disabled fails closed rather than silently returning mock users', async () => {
  const repo = new AuthRepository();
  await assert.rejects(repo.findUserByEmail('test@example.com'), { status: 503 });
});
