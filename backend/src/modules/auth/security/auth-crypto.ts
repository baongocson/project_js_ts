import { randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';
const ACCESS_LIFETIME_SECONDS = 900;
const REFRESH_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
function safeEqual(left: Buffer, right: Buffer): boolean { return left.length === right.length && timingSafeEqual(left, right); }
export function newRefreshToken(): string { return randomBytes(32).toString('base64url'); }
export function hashRefreshToken(token: string): string { return createHash('sha256').update(token, 'utf8').digest('hex'); }
export function refreshExpiresAt(now = new Date()): Date { return new Date(now.getTime() + REFRESH_LIFETIME_SECONDS * 1000); }

export interface AccessClaims { sub: string; sid: string; iss: string; aud: string; iat: number; exp: number; }
export interface TokenSettings { secret: string; issuer: string; audience: string }
export function validateTokenSettings(settings: TokenSettings): void {
  if (Buffer.byteLength(settings.secret, 'utf8') < 32) throw new Error('ACCESS_TOKEN_SECRET must contain at least 32 UTF-8 bytes');
  if (!settings.issuer || !settings.audience) throw new Error('Token issuer and audience are required');
}
function signBytes(data: string, secret: string): Buffer { return createHmac('sha256', secret).update(data).digest(); }
export function issueAccessToken(userId: string, sessionId: string, settings: TokenSettings, nowSeconds = Math.floor(Date.now() / 1000)) {
  validateTokenSettings(settings);
  if (!/^[a-f0-9]{24}$/i.test(userId) || !/^[a-f0-9]{24}$/i.test(sessionId)) throw new Error('Invalid ObjectId for access token');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims: AccessClaims = { sub: userId, sid: sessionId, iss: settings.issuer, aud: settings.audience, iat: nowSeconds, exp: nowSeconds + ACCESS_LIFETIME_SECONDS };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const payload = `${header}.${body}`;
  return { accessToken: `${payload}.${signBytes(payload, settings.secret).toString('base64url')}`, expiresIn: ACCESS_LIFETIME_SECONDS };
}
export function verifyAccessToken(token: string, settings: TokenSettings, nowSeconds = Math.floor(Date.now() / 1000)): AccessClaims | null {
  validateTokenSettings(settings);
  if (token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [header64, payload64, signature64] = parts;
  let header: unknown;
  let payload: unknown;
  try { header = JSON.parse(Buffer.from(header64, 'base64url').toString('utf8')) as unknown;
    payload = JSON.parse(Buffer.from(payload64, 'base64url').toString('utf8')) as unknown;
  } catch { return null; }
  if (typeof header !== 'object' || header === null || !('alg' in header) || header.alg !== 'HS256' || !('typ' in header) || header.typ !== 'JWT') return null;
  const presented = Buffer.from(signature64, 'base64url');
  if (!safeEqual(presented, signBytes(`${header64}.${payload64}`, settings.secret))) return null;
  if (typeof payload !== 'object' || payload === null) return null;
  const claims = payload as Record<string, unknown>;
  if (typeof claims.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(claims.sub) ||
      typeof claims.sid !== 'string' || !/^[a-f0-9]{24}$/i.test(claims.sid) ||
      claims.iss !== settings.issuer || claims.aud !== settings.audience ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
      (claims.iat as number) > nowSeconds || (claims.exp as number) <= nowSeconds ||
      (claims.exp as number) - (claims.iat as number) !== ACCESS_LIFETIME_SECONDS) return null;
  return claims as unknown as AccessClaims;
}
