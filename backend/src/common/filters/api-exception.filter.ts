import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const details = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    if (status === 429 && typeof details.details === 'object' && details.details !== null && 'retryAfter' in details.details) {
      response.setHeader('Retry-After', String(details.details.retryAfter));
    }
    const requestId = randomUUID();
    if (status >= 500 && status !== 501) this.logger.error(`Request ${requestId} failed`, exception instanceof Error ? exception.stack : undefined);
    const messages = Array.isArray(details.message) ? details.message.filter((value): value is string => typeof value === 'string') : null;
    const message = status === 500 ? 'Lỗi hệ thống' : messages ? 'Dữ liệu không hợp lệ' : typeof details.message === 'string' ? details.message : typeof body === 'string' ? body : 'Không thể thực hiện yêu cầu';
    const publicDetails = details.details ?? (messages ? { issues: messages.map((text) => ({ path: '', code: 'INVALID_VALUE', message: text })) } : {});
    response.status(status).json({ error: {
      code: details.code ?? (status === 400 ? 'VALIDATION_ERROR' : `HTTP_${status}`),
      message,
      details: publicDetails, requestId,
    } });
  }
}
