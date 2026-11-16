import { test, expect } from '@playwright/test';

test('home reads health through the Vite proxy from the real Nest backend', async ({ page }) => {
  const healthResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/v1/health' && response.status() === 200,
  );
  await page.goto('/');
  await healthResponse;
  await expect(page.getByRole('heading', { name: 'Không gian phân tích dữ liệu', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Đã kết nối · MongoDB: disabled');
});

test('an HTTP failure is displayed instead of a false connected status', async ({ page }) => {
  await page.route('**/api/v1/health', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'DATABASE_UNAVAILABLE' } }),
  }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('API trả mã 503');
});

test('a failed network request is shown to the user', async ({ page }) => {
  await page.route('**/api/v1/health', route => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('status')).not.toHaveText('Đang kiểm tra…');
  await expect(page.getByRole('status')).toContainText(/fetch|network|kết nối/i);
});

test('an unknown route can navigate home and reload without losing routing', async ({ page }) => {
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  await page.getByRole('link', { name: 'Về trang chủ' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status')).toHaveText('Đã kết nối · MongoDB: disabled');
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Đã kết nối · MongoDB: disabled');
});
