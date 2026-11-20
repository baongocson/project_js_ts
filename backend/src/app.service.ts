import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthRepository } from './infrastructure/database/health.repository';
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService, private readonly repository:HealthRepository) {}
  async health() {
    const enabled = this.config.get('DATABASE_ENABLED') === 'true';
    if (enabled) {
      try {
        await this.repository.ping();
      } catch {
        throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Không thể kết nối cơ sở dữ liệu' });
      }
    }
    return { status: 'ok', service: 'dashboard-3d-api', stage: 'scaffold', database: enabled ? 'connected' : 'disabled' };
  }
}
