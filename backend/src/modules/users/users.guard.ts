import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

/** Optional module-level alias. Global AuthGuard already protects Users routes. */
@Injectable()
export class UsersGuard implements CanActivate {
  constructor(private readonly auth: AuthGuard) {}
  canActivate(context: ExecutionContext): Promise<boolean> { return this.auth.canActivate(context); }
}
