import { parseEmptyQuery } from '../../common/validation/query.validation';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { DtoValidationPipe } from '../../common/validation/dto-validation.pipe';
import { resourceParams, type ResourceParamsDto } from '../../common/validation/request.validation';
import type { PatchUserDto } from './dto/user.dto';
import { parsePatchUser } from './dto/user.validation';
import { parseEmptyBody } from '../auth/dto/auth.validation';
import type { EmptyBodyDto } from '../auth/dto/auth.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  getMe(@Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('getMe');
  }

  @Patch('me')
  updateMe(@Body(new DtoValidationPipe(parsePatchUser)) _body: PatchUserDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('updateMe');
  }

  @Delete('me')
  deleteMe(@Body(new DtoValidationPipe(parseEmptyBody)) _body: EmptyBodyDto, @Query(new DtoValidationPipe(parseEmptyQuery)) _query: Record<string, never>) {
    return this.service.pending('deleteMe');
  }

}
