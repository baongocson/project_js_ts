import { ConfigService } from '@nestjs/config';
import { validateTokenSettings, type TokenSettings } from './auth-crypto';

export function tokenSettings(config: ConfigService): TokenSettings {
  const settings = {
    secret: config.get<string>('AUTH_ACCESS_TOKEN_SECRET') ?? '',
    issuer: config.get<string>('AUTH_TOKEN_ISSUER') ?? 'dashboard-3d',
    audience: config.get<string>('AUTH_TOKEN_AUDIENCE') ?? 'dashboard-3d-frontend',
  };
  validateTokenSettings(settings);
  return settings;
}
