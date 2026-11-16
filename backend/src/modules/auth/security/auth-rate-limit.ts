import { Injectable, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

interface Bucket { count: number; expiresAt: number }
@Injectable()
export class AuthRateLimit implements OnModuleDestroy {
  private readonly buckets = new Map<string, Bucket>();
  private readonly timer: ReturnType<typeof setInterval>;
  constructor(private readonly config: ConfigService) {
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref();
  }
  private key(scope: string, identity: string): string {
    return scope + ':' + createHash('sha256').update(identity).digest('hex');
  }
  private maximum(name: string, fallback: number): number { return Number(this.config.get(name) ?? fallback); }
  check(scope: string, identity: string, limit: number, windowMs: number): void {
    const key = this.key(scope, identity), now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      bucket = { count: 0, expiresAt: now + windowMs };
      if (this.buckets.size >= 100_000) this.sweep();
      if (this.buckets.size >= 100_000 && !this.buckets.has(key)) this.reject(60);
      this.buckets.set(key, bucket);
    }
    if (bucket.count >= limit) this.reject(Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)));
    bucket.count++;
  }
  request(action: string, ip: string, refreshIdentity?: string): void {
    if (action === 'register') this.check('register', ip, this.maximum('AUTH_REGISTER_LIMIT', 10), 900_000);
    if (action === 'login') this.check('login', ip, this.maximum('AUTH_LOGIN_LIMIT', 60), 900_000);
    if (action === 'refresh') {
      this.check('refresh-ip', ip, this.maximum('AUTH_REFRESH_LIMIT', 60), 60_000);
      if (refreshIdentity) this.check('refresh-session', refreshIdentity, this.maximum('AUTH_REFRESH_LIMIT', 60), 60_000);
    }
    if (action === 'logout') this.check('logout', ip, this.maximum('AUTH_LOGOUT_LIMIT', 60), 60_000);
  }
  loginAttempt(ip: string, email: string): void { this.check('login-failure', `${ip}\n${email}`, this.maximum('AUTH_LOGIN_FAILURE_LIMIT', 5), 900_000); }
  loginSucceeded(ip: string, email: string): void { this.buckets.delete(this.key('login-failure', `${ip}\n${email}`)); }
  sessionRefresh(sessionId: string): void { this.check('refresh-session', sessionId, this.maximum('AUTH_REFRESH_LIMIT', 60), 60_000); }
  private reject(retryAfter: number): never {
    throw new HttpException({ code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu, vui lòng thử lại sau', details: { retryAfter } }, HttpStatus.TOO_MANY_REQUESTS);
  }
  private sweep(): void { const now = Date.now(); for (const [key, value] of this.buckets) if (value.expiresAt <= now) this.buckets.delete(key); }
  onModuleDestroy(): void { clearInterval(this.timer); this.buckets.clear(); }
}
