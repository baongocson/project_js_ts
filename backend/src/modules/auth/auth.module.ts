import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';

@Module({ controllers: [AuthController], providers: [AuthService, AuthGuard, AuthRepository], exports: [AuthService] })
export class AuthModule {}
