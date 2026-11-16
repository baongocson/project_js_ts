import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, HttpCode, Patch, Query } from '@nestjs/common';
import { CurrentPrincipal, type Principal } from '../auth/security/auth-context';
import { UsersService } from './users.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import type { PatchUserDto } from './dto/user.dto';
import { parsePatchUser } from './dto/user.validation';
import { parseEmptyBody } from '../auth/dto/auth.validation';
import type { EmptyBodyDto } from '../auth/dto/auth.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  getMe(@CurrentPrincipal() principal: Principal, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.getMe(principal.userId);
  }

  @Patch('me')
  updateMe(@CurrentPrincipal() principal: Principal, @Body(new DtoValidationPipe(parsePatchUser)) body: PatchUserDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.updateMe(principal, body);
  }

  @Delete('me')
  @HttpCode(204)
  deleteMe(@CurrentPrincipal() principal: Principal, @Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.deleteMe(principal);
  }

}
