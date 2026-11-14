import { Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService, @Optional() @InjectConnection() private readonly connection?: Connection) {}
  async health() {
    const enabled = this.config.get('DATABASE_ENABLED') === 'true';
    if (enabled) {
      try {
        if (this.connection?.readyState !== 1) throw new Error('Disconnected');
        await this.connection.db!.command({ ping: 1 }, { timeoutMS: 3000 });
      } catch {
        throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Không thể kết nối cơ sở dữ liệu' });
      }
    }
    return { status: 'ok', service: 'dashboard-3d-api', stage: 'scaffold', database: enabled ? 'connected' : 'disabled' };
  }
}
