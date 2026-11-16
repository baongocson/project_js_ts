import { Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import type { AuthUserRecord } from '../auth/auth.repository';
import type { PatchUserDto } from './dto/user.dto';
import { OwnershipService } from '../auth/security/ownership.service';
import type { Principal } from '../auth/security/auth-context';

/** Persistence boundary reserved for hồ sơ và tài khoản; no mock CRUD. */
@Injectable()
export class UsersRepository {
  constructor(private readonly ownership: OwnershipService, @Optional() @InjectConnection() private readonly connection?: Connection) {}
  private users() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db.collection<AuthUserRecord>('users');
  }
  async get(userId: string): Promise<AuthUserRecord> {
    const user = await this.users().findOne({ _id: new Types.ObjectId(userId), lifecycle: 'active' });
    if (!user) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
    return user;
  }
  async patch(principal: Principal, dto: PatchUserDto): Promise<AuthUserRecord> {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (Object.hasOwn(dto, 'displayName')) fields.displayName = dto.displayName;
    if (dto.preferences?.theme) fields['preferences.theme'] = dto.preferences.theme;
    this.users();
    const session = await this.connection!.startSession();
    try {
      return await session.withTransaction(async () => {
        await this.ownership.fence(principal, undefined, session);
        const user = await this.users().findOneAndUpdate({ _id: new Types.ObjectId(principal.userId), lifecycle: 'active' }, { $set: fields }, { returnDocument: 'after', session });
        if (!user) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
        return user;
      });
    } finally { await session.endSession(); }
  }
}
