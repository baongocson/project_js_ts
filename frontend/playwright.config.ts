import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './test/E2E',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: fileURLToPath(new URL('../backend', import.meta.url)),
      url: 'http://127.0.0.1:4300/api/v1/health',
      env: { DATABASE_ENABLED: 'false', PORT: '4300', FRONTEND_ORIGIN: 'http://127.0.0.1:4173' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run preview -- --port 4173',
      url: 'http://127.0.0.1:4173',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:4300' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
