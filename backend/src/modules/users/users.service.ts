import { HttpException, Injectable, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { OwnershipService } from '../auth/security/ownership.service';
import { UsersRepository } from './users.repository';
import { AccountCleanupService } from '../../infrastructure/database/account-cleanup.service';
import { publicUser, patchUserResponse } from './dto/user-response.mapper';
import type { PatchUserDto } from './dto/user.dto';
import type { Principal } from '../auth/security/auth-context';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository, private readonly cleanup: AccountCleanupService, private readonly config: ConfigService,private readonly ownership:OwnershipService) {}
  private ensureEnabled(action: string): void { if (this.config.get('DATABASE_ENABLED') !== 'true') this.pending(action); }
  async getMe(userId: string) { this.ensureEnabled('getMe'); return publicUser(await this.repo.get(userId)); }
  async updateMe(principal: Principal, dto: PatchUserDto) {
    this.ensureEnabled('updateMe');
    return this.repo.transaction(async session=>{
      await this.ownership.fence(principal,undefined,session);
      return patchUserResponse(await this.repo.patch(principal.userId,dto,session));
    });
  }
  async deleteMe(principal: Principal): Promise<void> {
    this.ensureEnabled('deleteMe');
    try {
      const id = new Types.ObjectId(principal.userId);
      await this.cleanup.markUserDeleting(id, principal);
      await this.cleanup.removeUser(id);
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() < 500) throw error;
      throw new ServiceUnavailableException({ code: 'SERVICE_UNAVAILABLE', message: 'Chưa hoàn tất xóa tài khoản; hệ thống sẽ tiếp tục dọn dữ liệu' });
    }
  }
  pending(action: string): never {
    throw new NotImplementedException({ code: 'NOT_IMPLEMENTED', message: 'Chức năng chưa được triển khai', details: { module: 'users', action } });
  }
}
