import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { parseIdempotencyKey } from './request.validation';
export const IdempotencyKey = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
 const request = context.switchToHttp().getRequest<{headers:Record<string,string|string[]|undefined>}>();
 return parseIdempotencyKey(request.headers['idempotency-key']);
});
