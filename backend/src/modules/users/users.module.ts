import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { UsersGuard } from './users.guard';
import { UsersRepository } from './users.repository';

@Module({ controllers: [UsersController], providers: [UsersService, UsersGuard, UsersRepository], exports: [UsersService] })
export class UsersModule {}
