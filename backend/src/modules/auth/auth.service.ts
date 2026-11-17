import { ConflictException, ForbiddenException, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { hashRefreshToken, issueAccessToken, newRefreshToken, refreshExpiresAt } from './security/auth-crypto';
import { tokenSettings } from './security/token-settings';
import { AuthRateLimit } from './security/auth-rate-limit';
import { registerResponse, loginResponse } from '../users/dto/user-response.mapper';
import type { RegisterDto, LoginDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository, private readonly config: ConfigService, private readonly rate: AuthRateLimit) {}

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
  async login(dto: LoginDto, origin: string | undefined, ip = 'unknown') {
    this.ensureEnabled('login'); this.validateOrigin(origin);
    this.rate.loginAttempt(ip, dto.email);
    const user = await this.repo.findUserByEmail(dto.email);
    // Perform the same bcrypt cost for an unknown account to reduce enumeration by timing.
    const passwordMatches = await compare(dto.password, user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
    if (!user || !passwordMatches) this.credentialFailure();
    if (user.lifecycle !== 'active') throw new ForbiddenException({ code: 'USER_DELETING', message: 'Tài khoản không khả dụng', details: {} });
    const settings = tokenSettings(this.config);
    const refreshToken = newRefreshToken();
    const session = await this.repo.createSession(user._id, hashRefreshToken(refreshToken), refreshExpiresAt());
    this.rate.loginSucceeded(ip, dto.email);
    const access = issueAccessToken(user._id.toHexString(), session._id.toHexString(), settings);
    return { response: loginResponse(user, access.accessToken, access.expiresIn), refreshToken, cookieExpiresAt: session.expiresAt };
  }
  async refresh(refreshToken: string | undefined, origin: string | undefined) {
    this.ensureEnabled('refresh'); this.validateOrigin(origin);
    if (!refreshToken || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken)) this.refreshFailure();
    const currentHash = hashRefreshToken(refreshToken);
    const session = await this.repo.findActiveSessionByRefreshHash(currentHash);
    if (!session) this.refreshFailure();
    this.rate.sessionRefresh(session._id.toHexString());
    const user = await this.repo.findUserById(session.userId);
    if (!user || user.lifecycle !== 'active') this.refreshFailure();
    const settings = tokenSettings(this.config);
    const replacement = newRefreshToken();
    // Absolute expiry is preserved; a refresh must not extend the 7-day lifetime.
    const rotated = await this.repo.rotateSession(session._id, currentHash, hashRefreshToken(replacement));
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
