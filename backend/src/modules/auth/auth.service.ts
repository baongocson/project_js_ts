import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  pending(action: string): never {
    throw new NotImplementedException({ code: 'NOT_IMPLEMENTED', message: 'Chức năng chưa được triển khai', details: { module: 'auth', action } });
  }
}
