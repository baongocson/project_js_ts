const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createConnection } = require('mongoose');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { provisionDatabase, verifyDatabase } = require('../dist/infrastructure/database/database.provision');

// Keep each Jest integration spec in a separate OS process. On Windows, this
// prevents native state from one suite contaminating the next suite. A crashed
// child always fails the command; we never silently skip or retry tests.
const suites = [
  ['be2', 'src/test/integration/modules/datasets/be2.integration-spec.ts'],
  ['auth', 'src/test/integration/modules/auth/auth.integration-spec.ts'],
  ['database', 'src/test/integration/infrastructure/database/database.integration-spec.ts'],
  ['database-health', 'src/test/integration/infrastructure/database/database-health.integration-spec.ts'],
  ['be3', 'src/test/integration/modules/processing/be3.integration-spec.ts'],
  ['method-matrix', 'src/test/integration/modules/processing/method-matrix.integration-spec.ts'],
];

function selectedSuites(argv) {
  if (argv.includes('--be2')) return suites.filter(([name]) => name === 'be2');
  const only = argv.find(arg => arg.startsWith('--only='));
  if (!only) return suites;
  const name = only.substring('--only='.length);
  const chosen = suites.filter(([suite]) => suite === name);
  if (!chosen.length) throw new Error(`Unknown integration suite: ${name}. Options: ${suites.map(([suite]) => suite).join(', ')}`);
  return chosen;
}

function runSuite(name, path, env) {
  console.log(`\n=== Integration suite: ${name} ===`);
  const args = [
    require.resolve('jest/bin/jest'), '--config', 'jest.config.cjs',
    '--runInBand', '--selectProjects', 'integration', '--runTestsByPath', path,
  ];
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit', windowsHide: true, env,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0 && !signal) return resolveResult(true);
      const unsignedCode = code == null ? null : code >>> 0;
      const hex = unsignedCode == null ? 'unknown' : `0x${unsignedCode.toString(16).toUpperCase()}`;
      console.error(`Integration suite ${name} FAILED: exit=${code}, hex=${hex}, signal=${signal || 'none'}`);
      resolveResult(false);
    });
  });
}

async function main() {
  const chosen = selectedSuites(process.argv.slice(2));
  // Original test runner's isolated temporary replica (not user Atlas URI).
  const replica = await MongoMemoryReplSet.create({
    binary: { version: '8.0.16', downloadDir: resolve(__dirname, '../storage/test-binaries') },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ ip: '127.0.0.1' }],
  });
  let connection;
  try {
    const dbName = `be2_${randomUUID().replaceAll('-', '')}`;
    const uri = replica.getUri();
    connection = await createConnection(uri, { dbName, autoIndex: false, autoCreate: false }).asPromise();
    await provisionDatabase(connection);
    await verifyDatabase(connection);
    await connection.close();
    connection = undefined;
    const env = {
      ...process.env,
      MONGODB_URI: uri,
      MONGODB_DB_NAME: dbName,
      DATABASE_ENABLED: 'true',
      ACCOUNT_CLEANUP_ENABLED: 'false',
      PROJECT_CLEANUP_ENABLED: 'false',
      IMPORT_RECOVERY_ENABLED: 'false',
    };
    for (const [name, path] of chosen) {
      const passed = await runSuite(name, path, env);
      if (!passed) {
        process.exitCode = 1;
        return;
      }
    }
    console.log(`\nINTEGRATION PASSED: ${chosen.length}/${chosen.length} suites`);
  } finally {
    await connection?.close();
    await replica.stop();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
