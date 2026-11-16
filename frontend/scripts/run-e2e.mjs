import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const cwd = fileURLToPath(new URL('../', import.meta.url));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Chạy qua npm run test:e2e -w frontend.');

function run(script, args, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The browser suite must never use an API URL from a developer's .env or shell.
run(npmCli, ['run', 'build'], { ...process.env, VITE_API_BASE_URL: '/api/v1' });
run(npmCli, ['run', 'build', '-w', '@dashboard/backend']);
run(require.resolve('@playwright/test/cli'), ['test', ...process.argv.slice(2)]);
