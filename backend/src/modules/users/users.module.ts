import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { UsersGuard } from './users.guard';
import { UsersRepository } from './users.repository';
import { ConfigModule } from '@nestjs/config';
import { AccountCleanupModule } from '../../infrastructure/database/account-cleanup.module';

@Module({ imports: [ConfigModule, AccountCleanupModule], controllers: [UsersController], providers: [UsersService, UsersGuard, UsersRepository], exports: [UsersService] })
export class UsersModule {}
