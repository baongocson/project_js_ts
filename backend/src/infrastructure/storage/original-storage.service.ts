import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, open, readFile, realpath, unlink, readdir, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { PROJECT_ROOT } from '../database/database.connection';
import { sha256 } from '../idempotency/idempotency.service';
export interface OriginalStorage { put(key: string, bytes: Uint8Array): Promise<void>; read(key: string): Promise<Uint8Array>; remove(key: string): Promise<void> }
@Injectable()
export class OriginalStorageService implements OriginalStorage {
  readonly root: string;
  constructor(config: ConfigService) { this.root = resolve(config.get<string>('ORIGINAL_STORAGE_ROOT') || resolve(PROJECT_ROOT, 'backend/storage/originals')); }
  private path(key: string) {
    if (!/^[a-f0-9]{24}-[a-f0-9-]{36}\.csv$/.test(key)) throw new Error('Invalid original storage key');
    return resolve(this.root, key);
  }
  private async checked(key: string): Promise<string> {
    const target = await realpath(this.path(key)), root = await realpath(this.root), rel = relative(root, target);
    if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error('Storage path escapes root');
    return target;
  }
  async put(key: string, bytes: Uint8Array): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const file = await open(this.path(key), 'wx');
    try { await file.writeFile(bytes); await file.sync(); }
    finally { await file.close(); }
    if (sha256(await this.read(key)) !== sha256(bytes)) throw new Error('Original checksum mismatch');
  }
  async read(key: string): Promise<Uint8Array> { return readFile(await this.checked(key)); }
  async remove(key: string): Promise<void> {
    try { await unlink(await this.checked(key)); }
    catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
  /** Only generated names; caller checks durable references before removing an orphan. */
  async oldKeys(before: Date): Promise<string[]> {
    let keys: string[];
    try { keys = await readdir(this.root); }
    catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return []; throw error; }
    const old: string[] = [];
    for (const key of keys) if (/^[a-f0-9]{24}-[a-f0-9-]{36}\.csv$/.test(key) && (await stat(await this.checked(key))).mtime < before) old.push(key);
    return old;
  }
}
