const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createConnection } = require('mongoose');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { provisionDatabase, verifyDatabase } = require('../dist/infrastructure/database/database.provision');

async function main() {
  // A fresh mongod process and random database, never an application URI.
  const replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: resolve(__dirname, '../storage/test-binaries') }, replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ ip: '127.0.0.1' }] });
  let connection;
  try {
    const dbName = `be2_${randomUUID().replaceAll('-', '')}`;
    const uri = replica.getUri();
    connection = await createConnection(uri, { dbName, autoIndex: false, autoCreate: false }).asPromise();
    await provisionDatabase(connection); await verifyDatabase(connection);
    await connection.close(); connection = undefined;
    const args = [require.resolve('jest/bin/jest'), '--config', 'jest.config.cjs', '--runInBand', '--selectProjects', 'integration'];
    if (process.argv.includes('--be2')) args.push('--runTestsByPath', 'src/test/integration/modules/datasets/be2.integration-spec.ts');
    process.exitCode = await new Promise((accept, reject) => {
      const child = spawn(process.execPath, args, { cwd: resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true, env: { ...process.env, MONGODB_URI: uri, MONGODB_DB_NAME: dbName, DATABASE_ENABLED: 'true', ACCOUNT_CLEANUP_ENABLED: 'false', PROJECT_CLEANUP_ENABLED: 'false', IMPORT_RECOVERY_ENABLED: 'false' } });
      child.once('error', reject);
      child.once('exit', code => accept(code ?? 1));
    });
  } finally { await connection?.close(); await replica.stop(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
