import { ConflictException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types, type ClientSession } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { IdempotencyRepository, type Receipt } from './idempotency.repository';
import { canonicalRequest } from '../../common/domain/canonical-request';
import { sha256 } from '../../common/domain/sha256';
import { OwnershipService } from '../../modules/auth/security/ownership.service';
import type { Principal } from '../../modules/auth/security/auth-context';
export interface Lease { id: Types.ObjectId; token: string; digest: string; principal: Principal; projectId?: string }
export type Claim = { replay: true; body: unknown } | { replay: false; lease: Lease };
export { sha256 } from '../../common/domain/sha256';
@Injectable()
export class IdempotencyService {
  readonly leaseMs: number;
  readonly heartbeatMs: number;
  constructor(private readonly ownership: OwnershipService, config: ConfigService, private readonly repository:IdempotencyRepository) {
    this.leaseMs = Number(config.get('IDEMPOTENCY_LEASE_MS') ?? 60_000);
    this.heartbeatMs = Number(config.get('IDEMPOTENCY_HEARTBEAT_MS') ?? 20_000);
  }
  private pending(): never { throw new ConflictException({ code: 'IDEMPOTENCY_PENDING', message: 'Yêu cầu đang được xử lý', details: { retryAfter: Math.max(1, Math.ceil(this.heartbeatMs / 1000)) } }); }
  async claim(principal: Principal, projectId: string | undefined, actionScope: string, key: string, payload: unknown): Promise<Claim> {
    const filter = { userId: new Types.ObjectId(principal.userId), actionScope, keyDigest: sha256(key) };
    const requestHash = sha256(canonicalRequest(payload));
    try {
      return await this.repository.transaction(async session => {
        await this.ownership.fence(principal, projectId, session);
        const prior = await this.repository.findClaim(filter,session);
        if (prior?.projectId && !projectId) {
          await this.ownership.project(prior.projectId.toHexString(), principal, true);
          await this.ownership.fence(principal, prior.projectId.toHexString(), session);
        }
        if (prior && prior.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Key đã được dùng với payload khác' });
        if (prior?.response) {
          if (prior.status === 'succeeded') return { replay: true as const, body: prior.response.body };
          if (prior.status === 'failed') throw new HttpException(prior.response.body as object, prior.response.statusCode);
        }
        if (prior?.leaseUntil && prior.leaseUntil.getTime() > Date.now()) this.pending();
        // Publish and receipt commit in the same transaction. Taking the receipt write
        // lock fences an older worker: it can no longer write or commit after this CAS.
        const now = new Date(), token = randomUUID(), id = prior?._id ?? new Types.ObjectId();
        if (prior) {
          const changed = await this.repository.reclaim(prior,token,now,this.leaseMs,session);
          if (!changed.matchedCount) this.pending();
        } else await this.repository.insert({ _id: id, ...filter, projectId: projectId ? new Types.ObjectId(projectId) : null, requestHash, status: 'pending', response: null, leaseToken: token, leaseUntil: new Date(now.getTime() + this.leaseMs), createdAt: now, updatedAt: now }, session);
        return { replay: false as const, lease: { id, token, digest: sha256(canonicalRequest(filter.keyDigest + ':' + actionScope)), principal, projectId } };
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 11000) this.pending();
      throw error;
    }
  }
  async touch(lease: Lease, session: ClientSession): Promise<void> {
    await this.ownership.fence(lease.principal, lease.projectId, session);
    const now = new Date();
    const updated = await this.repository.touch(lease.id,lease.token,now,this.leaseMs,session);
    if (!updated.matchedCount) this.pending();
  }
  async complete(lease: Lease, statusCode: number, body: unknown, session: ClientSession, projectId?: string): Promise<void> {
    await this.touch(lease, session);
    await this.repository.complete(lease.id,lease.token,statusCode,body,session,projectId);
  }
  async run<T>(lease: Lease, work: () => Promise<T>): Promise<T> {
    let heartbeatError: unknown;
    let heartbeat: Promise<void> | undefined;
    const timer = setInterval(() => {
      if (heartbeat) return;
      heartbeat = this.repository.transaction(session => this.touch(lease, session)).catch(error => { heartbeatError = error; }).finally(() => { heartbeat = undefined; });
    }, this.heartbeatMs);
    timer.unref();
    try {
      if (heartbeatError) throw heartbeatError;
      return await work();
    } catch (error) {
      // A receipt already committed wins over an ambiguous network error.
      let receipt: Receipt | null;
      try { receipt = await this.repository.get(lease.id); }
      catch { throw new ServiceUnavailableException({ code: 'RECOVERY_REQUIRED', message: 'Chưa xác minh kết quả; retry cùng key và payload' }); }
      if (receipt?.status === 'succeeded' && receipt.response) {
        // Error recovery is a replay too: logout/deletion must not be bypassed
        // merely because the original publisher had reached its commit point.
        await this.repository.transaction(session => this.ownership.fence(lease.principal, receipt.projectId?.toHexString(), session));
        return receipt.response.body as T;
      }
      const status = error instanceof HttpException ? error.getStatus() : 503;
      if (status >= 400 && status < 500 && !(error instanceof ConflictException && (error.getResponse() as { code?: string }).code === 'IDEMPOTENCY_PENDING')) {
        try {
          await this.repository.transaction(async session => {
            await this.touch(lease, session);
            await this.repository.fail(lease.id,lease.token,status,(error as HttpException).getResponse(),session);
          });
        } catch { /* Lifecycle/lease loss leaves recovery responsible; never bypass a fence. */ }
      }
      throw error;
    } finally { clearInterval(timer); await heartbeat; }
  }
}
