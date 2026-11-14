import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { RegisterDto, LoginDto, EmptyBodyDto } from './dto/auth.dto';
import { parseRegister, parseLogin, parseEmptyBody } from './dto/auth.validation';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  register(@Body(new DtoValidationPipe(parseRegister)) _body: RegisterDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('register');
  }

  @Post('login')
  login(@Body(new DtoValidationPipe(parseLogin)) _body: LoginDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('login');
  }

  @Post('refresh')
  refresh(@Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('refresh');
  }

  @Post('logout')
  logout(@Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('logout');
  }

}
