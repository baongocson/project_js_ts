import { Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, type ClientSession } from 'mongoose';
import type { AuthUserRecord } from '../auth/auth.repository';
import type { PatchUserDto } from './dto/user.dto';
import { Be2Repository } from '../../infrastructure/database/be2-repository';

/** Persistence boundary reserved for hồ sơ và tài khoản; no mock CRUD. */
@Injectable()
export class UsersRepository extends Be2Repository {
  constructor(@Optional() @InjectConnection() connection?: Connection) {super(connection);}
  private users() {
    if (!this.connection?.db) throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Cơ sở dữ liệu chưa sẵn sàng' });
    return this.connection.db.collection<AuthUserRecord>('users');
  }
  async get(userId: string): Promise<AuthUserRecord> {
    const user = await this.users().findOne({ _id: new Types.ObjectId(userId), lifecycle: 'active' });
    if (!user) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
    return user;
  }
  async patch(userId:string,dto:PatchUserDto,session:ClientSession): Promise<AuthUserRecord> {
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (Object.hasOwn(dto, 'displayName')) fields.displayName = dto.displayName;
    if (dto.preferences?.theme) fields['preferences.theme'] = dto.preferences.theme;
    const user = await this.users().findOneAndUpdate({ _id: new Types.ObjectId(userId), lifecycle: 'active' }, { $set: fields }, { returnDocument: 'after', session });
    if (!user) throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Tài khoản không khả dụng' });
    return user;
  }
}
