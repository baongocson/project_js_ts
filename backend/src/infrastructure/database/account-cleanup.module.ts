import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountCleanupService } from './account-cleanup.service';

@Module({ imports: [ConfigModule], providers: [AccountCleanupService], exports: [AccountCleanupService] })
export class AccountCleanupModule {}
