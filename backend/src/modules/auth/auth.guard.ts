import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { AuthRepository } from './auth.repository';
import { verifyAccessToken } from './security/auth-crypto';
import { tokenSettings } from './security/token-settings';
import { PUBLIC_ROUTE, type AuthRequest } from './security/auth-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly repo: AuthRepository, private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (!header || !/^Bearer [A-Za-z0-9_.-]+$/.test(header)) this.deny();
    if (this.config.get<string>('DATABASE_ENABLED') !== 'true') this.deny();
    const claims = verifyAccessToken(header.slice(7), tokenSettings(this.config));
    if (!claims) this.deny();
    const session = await this.repo.findActiveSessionById(new Types.ObjectId(claims.sid));
    if (!session || session.userId.toHexString() !== claims.sub) this.deny();
    const user = await this.repo.findUserById(session.userId);
    if (!user || user.lifecycle !== 'active') this.deny();
    request.principal = { userId: claims.sub, sessionId: claims.sid };
    return true;
  }
  private deny(): never {
    throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}
