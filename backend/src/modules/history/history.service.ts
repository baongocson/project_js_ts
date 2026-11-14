import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class HistoryService {
  pending(action: string): never {
    throw new NotImplementedException({ code: 'NOT_IMPLEMENTED', message: 'Chức năng chưa được triển khai', details: { module: 'history', action } });
  }
}
