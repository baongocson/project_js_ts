import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

// Run only against the isolated local Docker database, never Atlas or a public server.
const baseURL = 'https://localhost:8443';
const browser = await chromium.launch({ channel: process.env.DOCKER_SMOKE_CHANNEL || undefined });
const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
const page = await context.newPage();
const email = `docker-smoke-${randomUUID()}@example.com`;
const password = `Docker-${randomUUID()}`;
let registered = false;
try {
  const health = await context.request.get('/api/v1/health');
  assert.equal(health.status(), 200);
  assert.equal((await health.json()).database, 'connected');
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  registered = true;
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  const cookie = (await context.cookies()).find(item => item.name === 'refresh_token');
  assert.ok(cookie?.secure && cookie?.httpOnly);
  await page.getByLabel('Tên project mới', { exact: true }).fill('Docker smoke');
  await page.getByRole('button', { name: 'Tạo project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Docker smoke', exact: true })).toBeVisible();
  await page.getByLabel('File CSV online', { exact: true }).setInputFiles({
    name: 'docker.csv', mimeType: 'text/csv', buffer: Buffer.from('score,label\n1,a\n2,b\n3,c\n'),
  });
  await page.getByRole('button', { name: 'Import lên server', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dòng 3, cột score', exact: true })).toHaveText('3');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dòng 3, cột score', exact: true })).toHaveText('3');
  console.log('PASS: HTTPS, database health, registration, login, Secure/HttpOnly cookie, CSV upload and reload persistence.');
} finally {
  try {
    if (registered) {
      // Clean up this test account and its database/storage data through normal APIs.
      const login = await context.request.post('/api/v1/auth/login', { headers: { Origin: baseURL }, data: { email, password } });
      assert.equal(login.status(), 200);
      const { accessToken } = await login.json();
      const result = await context.request.delete('/api/v1/users/me', {
        headers: { Origin: baseURL, Authorization: `Bearer ${accessToken}` }, data: {},
      });
      assert.equal(result.status(), 204, 'Smoke account cleanup failed');
      console.log('PASS: temporary account and uploaded test data cleaned up.');
    }
  } finally {
    await browser.close();
  }
}
