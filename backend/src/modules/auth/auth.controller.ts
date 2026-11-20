import { Body, Controller, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Public } from './security/auth-context';
import { AuthMutationGuard } from './security/auth-mutation.guard';
import type { Request, Response } from 'express';
import { parseEmptyQuery } from '../../common/validation/query.validation';
import { DtoValidationPipe } from '../../common/pipes/dto-validation.pipe';
import { AuthService } from './auth.service';
import type { RegisterDto, LoginDto, EmptyBodyDto } from './dto/auth.dto';
import { parseRegister, parseLogin, parseEmptyBody } from './dto/auth.validation';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

function cookieValue(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const tokens = header.split(';').map(x => x.trim());
  const matches = tokens.filter(x => x.startsWith(`${REFRESH_COOKIE}=`));
  if (matches.length !== 1) return undefined;
  return matches[0].slice(REFRESH_COOKIE.length + 1);
}
function storeRefreshCookie(response: Response, token: string, expires: Date): void {
  response.cookie(REFRESH_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: COOKIE_PATH, expires });
}
function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: COOKIE_PATH });
}

@Controller('auth')
@Public()
@UseGuards(AuthMutationGuard)
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  async register(@Body(new DtoValidationPipe(parseRegister)) body: RegisterDto,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>, @Req() request: Request) {
    return this.service.register(body, request.headers.origin);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new DtoValidationPipe(parseLogin)) body: LoginDto,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>,
    @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.service.login(body, request.headers.origin, request.ip || request.socket.remoteAddress || 'unknown');
    storeRefreshCookie(response, result.refreshToken, result.cookieExpiresAt);
    return result.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>,
    @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.service.refresh(cookieValue(request), request.headers.origin);
    storeRefreshCookie(response, result.refreshToken, result.cookieExpiresAt);
    return result.response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto,
    @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>,
    @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.service.logout(cookieValue(request), request.headers.origin);
    clearRefreshCookie(response);
  }
}
