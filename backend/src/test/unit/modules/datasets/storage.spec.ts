import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { OriginalStorageService } from '../../../../infrastructure/storage/original-storage.service';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
describe('Filesystem original storage adapter', () => {
  let root: string, storage: OriginalStorageService;
  const key = `0123456789abcdef01234567-${randomUUID()}.csv`;
  beforeAll(async () => { root = await mkdtemp(join(tmpdir(), 'be2-storage-')); storage = new OriginalStorageService(new ConfigService({ ORIGINAL_STORAGE_ROOT: root })); });
  afterAll(async () => { if (storage) await storage.remove(key); if (root) await rmdir(root); });
  it('writes exact bytes durably and refuses to overwrite an original', async () => {
    const bytes = Uint8Array.of(239, 187, 191, 97, 13, 10);
    await storage.put(key, bytes);
    expect(new Uint8Array(await storage.read(key))).toEqual(bytes);
    await expect(storage.put(key, Uint8Array.of(98))).rejects.toMatchObject({ code: 'EEXIST' });
    expect(new Uint8Array(await storage.read(key))).toEqual(bytes);
  });
  it('rejects traversal/absolute keys and makes missing-file cleanup idempotent', async () => {
    for (const name of ['../outside.csv', 'C:\\outside.csv', '/outside.csv']) await expect(storage.read(name)).rejects.toThrow('Invalid original storage key');
    await storage.remove(key); await storage.remove(key);
  });
});
