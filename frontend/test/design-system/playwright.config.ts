import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const candidates = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const executablePath = candidates.find(path => existsSync(path));
export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', outputDir: '../../test-results/design-system',
  workers: 1, retries: 0, reporter: 'list', timeout: 45_000,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure', launchOptions: { executablePath } },
  webServer: { command: 'node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort --config test/design-system/vite.config.ts --configLoader runner', cwd: root, url: 'http://127.0.0.1:4175', reuseExistingServer: false, env: { VITE_API_BASE_URL: '/api/v1' } },
});
