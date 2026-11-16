import { Module } from '@nestjs/common';
import { OriginalStorageService } from './original-storage.service';
import { StorageWriteBarrier } from './storage-write-barrier.service';
@Module({ providers: [OriginalStorageService, StorageWriteBarrier], exports: [OriginalStorageService, StorageWriteBarrier] })
export class StorageModule {}
