import { ConflictException, ForbiddenException, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { AuthRepository } from './repositories/auth.repository';
import { hashRefreshToken, issueAccessToken, newRefreshToken, refreshExpiresAt, validateTokenSettings, type TokenSettings } from './security/auth-crypto';
import { registerResponse, loginResponse } from '../users/dto/user-response.mapper';
import type { RegisterDto, LoginDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository, private readonly config: ConfigService) {}

  /** Preserves 501 while DATABASE_ENABLED=false, matching the existing HTTP skeleton tests. */
  private ensureEnabled(action: string): void {
    if (this.config.get<string>('DATABASE_ENABLED') !== 'true') this.pending(action);
  }
  pending(action: string): never {
    throw new NotImplementedException({ code: 'NOT_IMPLEMENTED', message: 'Chức năng chưa được triển khai khi Database tắt', details: { module: 'auth', action } });
  }
  validateOrigin(origin: string | undefined): void {
    // Called after enabled check so skeleton HTTP contracts remain unchanged.
    if (!origin || !this.config.getOrThrow<string>('FRONTEND_ORIGIN').split(',').map(x => x.trim()).includes(origin)) {
      throw new ForbiddenException({ code: 'ORIGIN_REJECTED', message: 'Origin không được phép', details: {} });
    }
  }
  private settings(): TokenSettings {
    const settings = {
      secret: this.config.get<string>('AUTH_ACCESS_TOKEN_SECRET') ?? '',
      issuer: this.config.get<string>('AUTH_TOKEN_ISSUER') ?? 'dashboard-3d',
      audience: this.config.get<string>('AUTH_TOKEN_AUDIENCE') ?? 'dashboard-3d-frontend',
    };
    validateTokenSettings(settings);
    return settings;
  }
  private credentialFailure(): never {
    throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không chính xác', details: {} });
  }
  async register(dto: RegisterDto, origin: string | undefined) {
    this.ensureEnabled('register'); this.validateOrigin(origin);
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.repo.createUser(dto.email, passwordHash);
      return registerResponse(user);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email đã được sử dụng', details: {} });
      }
      throw error;
    }
  }
  async login(dto: LoginDto, origin: string | undefined) {
    this.ensureEnabled('login'); this.validateOrigin(origin);
    const user = await this.repo.findUserByEmail(dto.email);
    if (!user) this.credentialFailure();
    if (!await compare(dto.password, user.passwordHash)) this.credentialFailure();
    if (user.lifecycle !== 'active') throw new ForbiddenException({ code: 'USER_DELETING', message: 'Tài khoản không khả dụng', details: {} });
    const settings = this.settings();
    const refreshToken = newRefreshToken();
    const session = await this.repo.createSession(user._id, hashRefreshToken(refreshToken), refreshExpiresAt());
    const access = issueAccessToken(user._id.toHexString(), session._id.toHexString(), settings);
    return { response: loginResponse(user, access.accessToken, access.expiresIn), refreshToken, cookieExpiresAt: session.expiresAt };
  }
  async refresh(refreshToken: string | undefined, origin: string | undefined) {
    this.ensureEnabled('refresh'); this.validateOrigin(origin);
    if (!refreshToken || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken)) this.refreshFailure();
    const currentHash = hashRefreshToken(refreshToken);
    const session = await this.repo.findActiveSessionByRefreshHash(currentHash);
    if (!session) this.refreshFailure();
    const user = await this.repo.findUserById(session.userId);
    if (!user || user.lifecycle !== 'active') this.refreshFailure();
    const settings = this.settings();
    const replacement = newRefreshToken();
    // Absolute expiry is preserved; a refresh must not extend the 7-day lifetime.
    const rotated = await this.repo.rotateSession(session._id, currentHash, hashRefreshToken(replacement), session.expiresAt);
    if (!rotated) this.refreshFailure();
    const access = issueAccessToken(user._id.toHexString(), session._id.toHexString(), settings);
    return { response: access, refreshToken: replacement, cookieExpiresAt: session.expiresAt };
  }
  private refreshFailure(): never {
    throw new UnauthorizedException({ code: 'AUTH_REFRESH_INVALID', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn', details: {} });
  }
  async logout(refreshToken: string | undefined, origin: string | undefined): Promise<void> {
    this.ensureEnabled('logout'); this.validateOrigin(origin);
    // Idempotent logout: missing, expired and previously revoked cookies still yield 204.
    if (refreshToken && /^[A-Za-z0-9_-]{43}$/.test(refreshToken)) {
      await this.repo.revokeSessionByRefreshHash(hashRefreshToken(refreshToken));
    }
  }
}
