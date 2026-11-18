import { test, expect } from '@playwright/test';

const fixture = '/test/design-system/ai-suggestions.html';
const scan = 'Phân tích toàn bộ dataset';
test('scans without chosen columns/method and previews the suggested column before explicit Apply', async ({ page }) => {
  await page.goto(fixture);
  const source = await page.getByTestId('source').textContent();
  await page.getByLabel('Các cột xử lý', { exact: true }).selectOption([]);
  await page.getByLabel('Phương pháp', { exact: true }).selectOption('uppercase');
  await expect(page.getByRole('button', { name: scan, exact: true })).toBeEnabled();
  await page.getByRole('button', { name: scan, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bỏ HTML · description' })).toBeVisible();
  await expect(page.getByTestId('source')).toHaveText(source!);
  await expect(page.getByTestId('preview-count')).toHaveText('Preview: 0');
  await expect(page.getByTestId('apply-count')).toHaveText('Apply: 0');
  await page.getByRole('button', { name: 'Xem trước gợi ý' }).click();
  await expect(page.getByLabel('Phương pháp', { exact: true })).toHaveValue('strip_html');
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await expect(page.getByTestId('preview-count')).toHaveText('Preview: 1');
  await expect(page.getByTestId('source')).toHaveText(source!);
  await page.getByRole('button', { name: 'Áp dụng thay đổi', exact: true }).click();
  await expect(page.getByTestId('apply-count')).toHaveText('Apply: 1');
  await expect(page.getByTestId('source')).toHaveText(' Hello ');
});
test('manual column/method changes preserve pending and completed dataset suggestions', async ({ page }) => {
  await page.goto(`${fixture}?mode=slow`);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await page.getByLabel('Các cột xử lý', { exact: true }).selectOption([]);
  await page.getByLabel('Phương pháp', { exact: true }).selectOption('lowercase');
  await expect(page.getByRole('button', { name: 'Xem trước gợi ý' })).toBeVisible();
  await page.getByLabel('Phương pháp', { exact: true }).selectOption('uppercase');
  await expect(page.getByRole('heading', { name: 'Bỏ HTML · description' })).toBeVisible();
  await expect(page.getByTestId('preview-count')).toHaveText('Preview: 0');
});
for (const change of ['Chuyển Missing', 'Chuyển phiên bản']) test(`${change}: discards late suggestions`, async ({ page }) => {
  await page.goto(`${fixture}?mode=slow`);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await page.getByRole('button', { name: change, exact: true }).click();
  await page.waitForTimeout(650);
  await expect(page.getByRole('button', { name: 'Xem trước gợi ý' })).toHaveCount(0);
});
test('automatically reviews subsequent batches', async ({ page }) => {
  await page.goto(`${fixture}?mode=multi`);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await expect(page.getByText(/AI đã xét 13\/13 ứng viên/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem trước gợi ý' })).toHaveCount(2);
  await expect(page.getByText(/Đã hoàn tất phân tích tất cả ứng viên/)).toBeVisible();
});
test('partial failure keeps results but never claims scan completion', async ({ page }) => {
  await page.goto(`${fixture}?mode=partial`);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await expect(page.getByText('Không kết nối được Ollama.')).toBeVisible();
  await expect(page.getByText(/Phân tích chưa hoàn tất/)).toBeVisible();
  await expect(page.getByText(/Đã hoàn tất phân tích tất cả ứng viên/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xem trước thay đổi', exact: true })).toBeEnabled();
});
test('cancel ignores late results and keeps manual processing available', async ({ page }) => {
  await page.goto(`${fixture}?mode=slow`);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await page.getByRole('button', { name: 'Dừng phân tích AI' }).click();
  await page.waitForTimeout(650);
  await expect(page.getByRole('button', { name: 'Xem trước gợi ý' })).toHaveCount(0);
  await expect(page.getByText(/Đã dừng phân tích AI/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem trước thay đổi', exact: true })).toBeEnabled();
});
for (const mode of ['error', 'empty', 'offline']) test(`${mode}: manual processing remains available`, async ({ page }) => {
  await page.goto(`${fixture}?mode=${mode}`);
  if (mode !== 'offline') await page.getByRole('button', { name: scan, exact: true }).click();
  await expect(page.getByText(mode === 'error' ? 'Không kết nối được Ollama.' : mode === 'empty' ? /Chưa có gợi ý phù hợp/ : /Gợi ý AI hiện hỗ trợ dataset trên server/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem trước thay đổi', exact: true })).toBeEnabled();
  await expect(page.getByTestId('preview-count')).toHaveText('Preview: 0');
  await expect(page.getByTestId('apply-count')).toHaveText('Apply: 0');
});
test('mobile suggestions fit viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fixture);
  await page.getByRole('button', { name: scan, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem trước gợi ý' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/design-system/ai-mobile.png', fullPage: true });
});
