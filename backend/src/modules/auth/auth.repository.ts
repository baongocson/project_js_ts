/** MongoDB persistence boundary for Auth; raw documents never leave the service projection. */
import { Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

export interface AuthUserRecord {
  _id: Types.ObjectId;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  displayName: string | null;
  preferences: { theme: 'system' | 'light' | 'dark' };
  lifecycle: 'active' | 'deleting';
  writeEpoch: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface AuthSessionRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  rotationCounter: number;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
}

@Injectable()
export class AuthRepository {
  /** Optional injection keeps DTO/HTTP tests working with DATABASE_ENABLED=false. */
  constructor(@Optional() @InjectConnection() private readonly connection?: Connection) {}

  private database() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db;
  }

  async createUser(emailNormalized: string, passwordHash: string, at = new Date()): Promise<AuthUserRecord> {
    const user: AuthUserRecord = {
      _id: new Types.ObjectId(), email: emailNormalized, emailNormalized, passwordHash,
      displayName: null, preferences: { theme: 'system' }, lifecycle: 'active', writeEpoch: 0,
      createdAt: at, updatedAt: at,
    };
    // Unique email and BSON contract are enforced by MongoDB Atlas, not only by the controller.
    await this.database().collection<AuthUserRecord>('users').insertOne(user);
    return user;
  }

  async findUserByEmail(emailNormalized: string): Promise<AuthUserRecord | null> {
    return this.database().collection<AuthUserRecord>('users').findOne({ emailNormalized });
  }

  async findUserById(userId: Types.ObjectId): Promise<AuthUserRecord | null> {
    return this.database().collection<AuthUserRecord>('users').findOne({ _id: userId });
  }

  async createSession(userId: Types.ObjectId, refreshTokenHash: string, expiresAt: Date, at = new Date()): Promise<AuthSessionRecord> {
    const session: AuthSessionRecord = {
      _id: new Types.ObjectId(), userId, refreshTokenHash, rotationCounter: 0,
      expiresAt, revokedAt: null, createdAt: at, lastUsedAt: at,
    };
    const transaction = await this.connection!.startSession();
    try {
      await transaction.withTransaction(async () => {
        // A write to the parent fences login against concurrent account deletion.
        const user = await this.database().collection<AuthUserRecord>('users').updateOne(
          { _id: userId, lifecycle: 'active' }, { $inc: { writeEpoch: 1 } }, { session: transaction },
        );
        if (!user.matchedCount) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
        await this.database().collection<AuthSessionRecord>('authSessions').insertOne(session, { session: transaction });
      });
    } finally { await transaction.endSession(); }
    return session;
  }

  async findActiveSessionByRefreshHash(refreshTokenHash: string, at = new Date()): Promise<AuthSessionRecord | null> {
    return this.database().collection<AuthSessionRecord>('authSessions').findOne({
      refreshTokenHash, revokedAt: null, expiresAt: { $gt: at },
    });
  }

  /** Atomic compare-and-swap: simultaneous refresh requests cannot both rotate the same token. */
  async rotateSession(sessionId: Types.ObjectId, presentedHash: string, replacementHash: string, at = new Date()): Promise<AuthSessionRecord | null> {
    this.database();
    const transaction = await this.connection!.startSession();
    try {
      return await transaction.withTransaction(async () => {
        const current = await this.database().collection<AuthSessionRecord>('authSessions').findOne(
          { _id: sessionId, refreshTokenHash: presentedHash, revokedAt: null, expiresAt: { $gt: at } }, { session: transaction },
        );
        if (!current) return null;
        const user = await this.database().collection<AuthUserRecord>('users').updateOne(
          { _id: current.userId, lifecycle: 'active' }, { $inc: { writeEpoch: 1 } }, { session: transaction },
        );
        if (!user.matchedCount) return null;
        return this.database().collection<AuthSessionRecord>('authSessions').findOneAndUpdate(
          { _id: sessionId, refreshTokenHash: presentedHash, revokedAt: null, expiresAt: { $gt: at } },
          { $set: { refreshTokenHash: replacementHash, lastUsedAt: at }, $inc: { rotationCounter: 1 } },
          { returnDocument: 'after', session: transaction },
        );
      });
    } finally { await transaction.endSession(); }
  }

  async revokeSessionByRefreshHash(refreshTokenHash: string, at = new Date()): Promise<boolean> {
    const result = await this.database().collection<AuthSessionRecord>('authSessions').updateOne(
      { refreshTokenHash, revokedAt: null }, { $set: { revokedAt: at } },
    );
    return result.modifiedCount === 1;
  }

  async findActiveSessionById(sessionId: Types.ObjectId, at = new Date()): Promise<AuthSessionRecord | null> {
    return this.database().collection<AuthSessionRecord>('authSessions').findOne({ _id: sessionId, revokedAt: null, expiresAt: { $gt: at } });
  }
}
