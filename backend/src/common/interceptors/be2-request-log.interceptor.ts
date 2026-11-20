import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';
export interface LoggedRequest extends Request { requestId?: string; startedAt?: number }
@Injectable()
export class Be2RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(Be2RequestLogInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<LoggedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    request.requestId = randomUUID(); request.startedAt = Date.now();
    response.setHeader('X-Request-Id', request.requestId);
    // Route pattern only: never log body, query, credentials or token headers.
    const action = `${request.method} ${String((request.route as { path?: string } | undefined)?.path ?? '')}`;
    return next.handle().pipe(tap({ next: () => this.logger.log(JSON.stringify({ requestId: request.requestId, action, elapsedMs: Date.now() - request.startedAt!, code: 'OK', status: response.statusCode })) }));
  }
}
