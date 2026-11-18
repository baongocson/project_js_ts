import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Only existing acceptance cases that operate on fresh, browser-local fixture data.
export default defineConfig({
  ...base,
  testDir: '../acceptance',
  testMatch: ['local-storage.spec.ts', 'storage-failure.spec.ts', 'cell-editor.spec.ts'],
  grep: /IndexedDB v1|local workspace revisions|local workspace quota|blocked IndexedDB|quota during original import|quota during local Apply|a real WebGL point/,
  outputDir: '../../test-results/neon-local-acceptance',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4176' },
  webServer: {
    ...base.webServer as object,
    command: 'node ../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort --config test/design-system/vite.config.ts --configLoader runner',
    url: 'http://127.0.0.1:4176',
  },
});
