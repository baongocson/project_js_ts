import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountCleanupService } from './account-cleanup.service';
import { StorageModule } from '../storage/storage.module';

@Module({ imports: [ConfigModule, StorageModule], providers: [AccountCleanupService], exports: [AccountCleanupService] })
export class AccountCleanupModule {}
