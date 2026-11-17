import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = fileURLToPath(new URL('../test/unit/', import.meta.url));
const entries = fs.readdirSync(directory).filter(name => name.endsWith('.test.ts')).map(name => `${directory}/${name}`);
await build({ entryPoints: entries, outdir: `${root}/.artifact-work/unit`, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external',
  define: { 'import.meta.env.VITE_API_BASE_URL': '"/api/v1"' } });
const files = entries.map(file => `${root}/.artifact-work/unit/${file.split('/').pop().replace(/\.ts$/, '.mjs')}`);
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
