import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthRateLimit } from './security/auth-rate-limit';
import { AuthMutationGuard } from './security/auth-mutation.guard';
import { OwnershipRepository } from './security/ownership.repository';
import { OwnershipService } from './security/ownership.service';
import { OwnershipGuard } from './security/ownership.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthRepository, AuthRateLimit, AuthMutationGuard, OwnershipRepository, OwnershipService, OwnershipGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: OwnershipGuard }],
  exports: [AuthService, AuthGuard, OwnershipService],
})
export class AuthModule {}
