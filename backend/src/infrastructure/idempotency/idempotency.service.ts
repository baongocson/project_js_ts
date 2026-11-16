import { ConflictException, HttpException, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { Be2Repository } from '../database/be2-repository';
import { canonicalRequest } from '../../common/domain/canonical-request';
import { OwnershipService } from '../../modules/auth/security/ownership.service';
import type { Principal } from '../../modules/auth/security/auth-context';
interface Receipt { _id: Types.ObjectId; userId: Types.ObjectId; projectId: Types.ObjectId | null; actionScope: string; keyDigest: string; requestHash: string; status: 'pending' | 'succeeded' | 'failed'; response: { statusCode: number; body?: unknown } | null; leaseUntil: Date | null; leaseToken: string | null; createdAt: Date; updatedAt: Date }
export interface Lease { id: Types.ObjectId; token: string; digest: string; principal: Principal; projectId?: string }
export type Claim = { replay: true; body: unknown } | { replay: false; lease: Lease };
export const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class IdempotencyService extends Be2Repository {
  readonly leaseMs: number;
  readonly heartbeatMs: number;
  constructor(private readonly ownership: OwnershipService, config: ConfigService, @Optional() @InjectConnection() connection?: Connection) {
    super(connection);
    this.leaseMs = Number(config.get('IDEMPOTENCY_LEASE_MS') ?? 60_000);
    this.heartbeatMs = Number(config.get('IDEMPOTENCY_HEARTBEAT_MS') ?? 20_000);
  }
  private records() { return this.db().collection<Receipt>('idempotencyRecords'); }
  private pending(): never { throw new ConflictException({ code: 'IDEMPOTENCY_PENDING', message: 'Yêu cầu đang được xử lý', details: { retryAfter: Math.max(1, Math.ceil(this.heartbeatMs / 1000)) } }); }
  async claim(principal: Principal, projectId: string | undefined, actionScope: string, key: string, payload: unknown): Promise<Claim> {
    const filter = { userId: new Types.ObjectId(principal.userId), actionScope, keyDigest: sha256(key) };
    const requestHash = sha256(canonicalRequest(payload));
    try {
      return await this.transaction(async session => {
        await this.ownership.fence(principal, projectId, session);
        const prior = await this.records().findOne(filter, { session });
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
          const changed = await this.records().updateOne({ _id: id, status: prior.status, leaseToken: prior.leaseToken, leaseUntil: prior.leaseUntil }, { $set: { status: 'pending', response: null, leaseToken: token, leaseUntil: new Date(now.getTime() + this.leaseMs), updatedAt: now } }, { session });
          if (!changed.matchedCount) this.pending();
        } else await this.records().insertOne({ _id: id, ...filter, projectId: projectId ? new Types.ObjectId(projectId) : null, requestHash, status: 'pending', response: null, leaseToken: token, leaseUntil: new Date(now.getTime() + this.leaseMs), createdAt: now, updatedAt: now }, { session });
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
    const updated = await this.records().updateOne({ _id: lease.id, status: 'pending', leaseToken: lease.token, leaseUntil: { $gt: now } }, { $set: { leaseUntil: new Date(now.getTime() + this.leaseMs), updatedAt: now } }, { session });
    if (!updated.matchedCount) this.pending();
  }
  async complete(lease: Lease, statusCode: number, body: unknown, session: ClientSession, projectId?: string): Promise<void> {
    await this.touch(lease, session);
    await this.records().updateOne({ _id: lease.id, leaseToken: lease.token, status: 'pending' }, { $set: { status: 'succeeded', response: { statusCode, body }, leaseUntil: null, leaseToken: null, ...(projectId ? { projectId: new Types.ObjectId(projectId) } : {}), updatedAt: new Date() } }, { session });
  }
  async run<T>(lease: Lease, work: () => Promise<T>): Promise<T> {
    let heartbeatError: unknown;
    let heartbeat: Promise<void> | undefined;
    const timer = setInterval(() => {
      if (heartbeat) return;
      heartbeat = this.transaction(session => this.touch(lease, session)).catch(error => { heartbeatError = error; }).finally(() => { heartbeat = undefined; });
    }, this.heartbeatMs);
    timer.unref();
    try {
      if (heartbeatError) throw heartbeatError;
      return await work();
    } catch (error) {
      // A receipt already committed wins over an ambiguous network error.
      let receipt: Receipt | null;
      try { receipt = await this.records().findOne({ _id: lease.id }); }
      catch { throw new ServiceUnavailableException({ code: 'RECOVERY_REQUIRED', message: 'Chưa xác minh kết quả; retry cùng key và payload' }); }
      if (receipt?.status === 'succeeded' && receipt.response) {
        // Error recovery is a replay too: logout/deletion must not be bypassed
        // merely because the original publisher had reached its commit point.
        await this.transaction(session => this.ownership.fence(lease.principal, receipt.projectId?.toHexString(), session));
        return receipt.response.body as T;
      }
      const status = error instanceof HttpException ? error.getStatus() : 503;
      if (status >= 400 && status < 500 && !(error instanceof ConflictException && (error.getResponse() as { code?: string }).code === 'IDEMPOTENCY_PENDING')) {
        try {
          await this.transaction(async session => {
            await this.touch(lease, session);
            await this.records().updateOne({ _id: lease.id, status: 'pending', leaseToken: lease.token }, { $set: { status: 'failed', response: { statusCode: status, body: (error as HttpException).getResponse() }, leaseUntil: null, leaseToken: null, updatedAt: new Date() } }, { session });
          });
        } catch { /* Lifecycle/lease loss leaves recovery responsible; never bypass a fence. */ }
      }
      throw error;
    } finally { clearInterval(timer); await heartbeat; }
  }
}
