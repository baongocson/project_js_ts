import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}
  health() { return { status: 'ok', service: 'dashboard-3d-api', stage: 'scaffold', database: this.config.get('DATABASE_ENABLED') === 'true' ? 'connected' : 'disabled' }; }
}
