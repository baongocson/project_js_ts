import { CallHandler, ExecutionContext, HttpException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { catchError, throwError } from 'rxjs';
const Upload = FileInterceptor('file', { limits: { fileSize: 16_000_000, files: 1, fields: 1, fieldSize: 1024 * 1024 } });
@Injectable()
export class CsvUploadInterceptor extends Upload {
  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      const stream = await super.intercept(context, next);
      return stream.pipe(catchError((error: unknown) => throwError(() => this.map(error))));
    } catch (error) { throw this.map(error); }
  }
  private map(error: unknown): unknown {
    if (error instanceof HttpException && error.getStatus() === 413) return new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', message: 'CSV vượt 16.000.000 byte' });
    return error;
  }
}
