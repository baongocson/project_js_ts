import { describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { issueAccessToken, verifyAccessToken, newRefreshToken, hashRefreshToken, refreshExpiresAt } from '../../../../modules/auth/security/auth-crypto';
import { AuthRateLimit } from '../../../../modules/auth/security/auth-rate-limit';
import { validateEnvironment } from '../../../../config/environment';

describe('Auth token validation', () => {
  const settings = { secret: randomBytes(48).toString('base64url'), issuer: 'test', audience: 'test-app' };
  const user = '0123456789abcdef01234567', session = '0123456789abcdef01234568';
  it('enforces signature, issuer, audience, expiry and fixed lifetime', () => {
    const issued = issueAccessToken(user, session, settings, 1000);
    expect(verifyAccessToken(issued.accessToken, settings, 1001)).toMatchObject({ sub: user, sid: session, exp: 1900 });
    expect(verifyAccessToken(issued.accessToken, settings, 1900)).toBeNull();
    expect(verifyAccessToken(issued.accessToken, settings, 999)).toBeNull();
    expect(verifyAccessToken(issued.accessToken, { ...settings, secret: 'x'.repeat(48) }, 1001)).toBeNull();
    expect(verifyAccessToken(issued.accessToken, { ...settings, issuer: 'other' }, 1001)).toBeNull();
    expect(verifyAccessToken(issued.accessToken, { ...settings, audience: 'other' }, 1001)).toBeNull();
    const parts = issued.accessToken.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: user, sid: 'attacker' })).toString('base64url');
    expect(verifyAccessToken(parts.join('.'), settings, 1001)).toBeNull();
    expect(verifyAccessToken('a.b.c', settings, 1001)).toBeNull();
  });
  it('generates 256-bit refresh tokens and absolute seven-day expiry', () => {
    const token = newRefreshToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newRefreshToken()).not.toBe(token);
    expect(hashRefreshToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(refreshExpiresAt(new Date(0)).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
  it('requires a secret when enabling persistence and rejects invalid limiter settings', () => {
    expect(() => validateEnvironment({ DATABASE_ENABLED: 'true', MONGODB_URI: 'mongodb://example' })).toThrow('AUTH_ACCESS_TOKEN_SECRET');
    expect(() => validateEnvironment({ AUTH_LOGIN_LIMIT: '0' })).toThrow('AUTH_LOGIN_LIMIT');
  });
});

describe('Auth rate limits', () => {
  it('blocks after the failure limit, resets on success and separates identities', () => {
    const rate = new AuthRateLimit(new ConfigService({ AUTH_LOGIN_FAILURE_LIMIT: 2 }));
    try {
      rate.loginAttempt('ip-a', 'a@example.com');
      rate.loginAttempt('ip-a', 'a@example.com');
      expect(() => rate.loginAttempt('ip-a', 'a@example.com')).toThrow(expect.objectContaining({ status: 429 }));
      expect(() => rate.loginAttempt('ip-b', 'a@example.com')).not.toThrow();
      rate.loginSucceeded('ip-a', 'a@example.com');
      expect(() => rate.loginAttempt('ip-a', 'a@example.com')).not.toThrow();
    } finally { rate.onModuleDestroy(); }
  });
  it('tracks a stable session through refresh rotation and returns a retry interval', () => {
    const rate = new AuthRateLimit(new ConfigService({ AUTH_REFRESH_LIMIT: 1 }));
    try {
      rate.sessionRefresh('session-id');
      expect(() => rate.sessionRefresh('session-id')).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { retryAfter: expect.any(Number) } }) }));
    } finally { rate.onModuleDestroy(); }
  });
});
