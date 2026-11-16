import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const PUBLIC_ROUTE = 'auth:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const PREVIEW_BODY = 'auth:preview-body';
export const PreviewBodyOwner = () => SetMetadata(PREVIEW_BODY, true);
export interface Principal { userId: string; sessionId: string }
export interface AuthRequest extends Request { principal?: Principal }
export const CurrentPrincipal = createParamDecorator((_data: unknown, context: ExecutionContext): Principal => {
  const principal = context.switchToHttp().getRequest<AuthRequest>().principal;
  if (!principal) throw new Error('Authenticated principal is required');
  return principal;
});
