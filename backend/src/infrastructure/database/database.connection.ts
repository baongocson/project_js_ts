import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { setServers } from 'node:dns';
import { isIP } from 'node:net';
import { createConnection } from 'mongoose';

export const PROJECT_ROOT = resolve(__dirname, '../../../..');
export const DATABASE_ENV_FILES = [resolve(PROJECT_ROOT, 'backend/.env'), resolve(PROJECT_ROOT, 'atlas-credentials.env')];

export function databaseEnvironment() {
  const env: Record<string, string | undefined> = {};
  for (const file of [...DATABASE_ENV_FILES].reverse()) if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
  return { ...env, ...process.env };
}

export function databaseOptions(env: Record<string, unknown>) {
  if (env.MONGODB_DNS_SERVERS) {
    const servers = String(env.MONGODB_DNS_SERVERS).split(',').map(v => v.trim());
    if (servers.some(v => !isIP(v))) throw new Error('MONGODB_DNS_SERVERS must contain IP addresses');
    setServers(servers);
  }
  const uri = String(env.MONGODB_URI ?? '');
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://');
  const dbName = String(env.MONGODB_DB_NAME ?? 'dashboard_3d');
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName)) throw new Error('MONGODB_DB_NAME must contain letters, numbers, underscores or hyphens');
  return { uri, dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000, maxPoolSize: 10, minPoolSize: 0, retryWrites: true };
}

export async function openDatabase(dbName?: string) {
  const options = databaseOptions(databaseEnvironment());
  const { uri, ...rest } = options;
  const connection = await createConnection(uri, { ...rest, ...(dbName ? { dbName } : {}) }).asPromise();
  try {
    await connection.db!.command({ ping: 1 });
    const hello = await connection.db!.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Database must support transactions (replica set or mongos)');
    return connection;
  } catch (error) { await connection.close(); throw error; }
}
