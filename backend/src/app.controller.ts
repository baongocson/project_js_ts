import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/security/auth-context';
@Controller('health')
@Public()
export class AppController {
  constructor(private readonly service: AppService) {}
  @Get()
  health() { return this.service.health(); }
}
