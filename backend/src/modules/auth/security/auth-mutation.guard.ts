import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthRateLimit } from './auth-rate-limit';
import type { Request } from 'express';

@Injectable()
export class AuthMutationGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly rate: AuthRateLimit) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    this.auth.validateOrigin(request.headers.origin);
    this.rate.request(context.getHandler().name, request.ip || request.socket.remoteAddress || 'unknown');
    return true;
  }
}
