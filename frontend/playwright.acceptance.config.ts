import { defineConfig,devices } from '@playwright/test';
if(process.env.ACCEPTANCE_BASE_URL!=='https://127.0.0.1:4174')throw new Error('Use the isolated test:acceptance runner');
if(!process.env.ACCEPTANCE_CERT_SPKI)throw new Error('Missing ephemeral test certificate fingerprint');
export default defineConfig({testDir:'./test/acceptance',outputDir:'test-results/acceptance',workers:1,retries:0,timeout:120_000,reporter:'list',use:{actionTimeout:10_000,baseURL:process.env.ACCEPTANCE_BASE_URL,ignoreHTTPSErrors:true,launchOptions:{args:[`--ignore-certificate-errors-spki-list=${process.env.ACCEPTANCE_CERT_SPKI}`]},...devices['Desktop Chrome'],trace:'retain-on-failure'}});
