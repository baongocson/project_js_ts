import { chooseMethod, ensureProcessing, openStep } from './workspace-navigation';
import { test, expect, type Page } from '@playwright/test';

const password = 'account-lifecycle-password-123';
const removeLabel = 'Xóa cả dữ liệu trên máy của tài khoản này';
const retainLabel = 'Tôi hiểu bản local và bản nháp giữ lại không thể đồng bộ về tài khoản đã xóa';
async function login(page: Page, email: string, register = false) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  if (register) {
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã đăng ký');
  }
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
}
async function local(page: Page, name: string) {
  await page.getByLabel('Tên project', { exact: true }).fill(name);
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'account.csv', mimeType: 'text/csv', buffer: Buffer.from('n,t\n1,a\n2,b\n') });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
}
async function pending(page: Page) {
  const email = `account-${crypto.randomUUID()}@example.com`;
  await page.goto('/offline'); await login(page, email, true); await local(page, 'Account pending');
  await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click();
  await expect(page.getByTestId('sync-state')).toContainText('synced');
  const project = await page.getByTestId('server-project').innerText();
  await chooseMethod(page,'uppercase');
  await ensureProcessing(page);await page.getByLabel('Các cột xử lý', { exact: true }).selectOption({ label: 't' });
  await page.getByRole('button', { name: 'Xem trước thay đổi', exact: true }).click();
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Áp dụng offline', exact: true }).click();
  await expect(page.getByTestId('sync-state')).toContainText('0/1');
  return { email, project };
}
async function records(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('dashboard3d-projects-v1', 2); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try { return await new Promise<{ name: string; accountId?: string; operations: unknown[] }[]>((resolve, reject) => { const r = db.transaction('projects').objectStore('projects').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
    finally { db.close(); }
  });
}

test('logout warns about pending data, cancels safely and signs out both tabs while retaining local history', async ({ page, context }) => {
  await pending(page);
  const other = await context.newPage();
  try {
    await other.goto('/offline'); await expect(other.locator('.connection-bar')).toContainText('Đã xác thực');
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('1 thao tác chưa đồng bộ');
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Đồng bộ lên server', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đã đăng xuất');
    await expect(other.getByRole('button', { name: 'Đồng bộ lên server', exact: true })).toBeDisabled();
    await expect(other.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('A');
    expect((await records(page))[0].operations).toHaveLength(1);
    await page.reload(); await expect(page.locator('.connection-bar')).toContainText('Chưa đăng nhập');
  } finally { await other.close(); }
});

test('profile deletion requires an explicit decision for pending local data and drafts and can keep both for recovery', async ({ page }) => {
  const { project } = await pending(page);
  await page.goto(`/projects/${project}`);
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toBeVisible();
  await page.getByLabel('Số dòng/trang', { exact: true }).selectOption('25');
  await page.getByRole('link', { name: 'Dữ liệu offline', exact: true }).click();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Xóa tài khoản', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('1 thao tác chưa đồng bộ'); await expect(dialog).toContainText('1 bản nháp workspace');
  await page.getByLabel('Nhập XÓA để xác nhận', { exact: true }).fill('XÓA');
  await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  await page.getByLabel(retainLabel, { exact: true }).check();
  await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/offline');
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('A');
  expect((await records(page))[0].operations).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('dashboard-workspace-draft-v1:')).length)).toBe(1);
});

test('account cleanup removes only explicitly selected owner data and keeps guest and other-account projects', async ({ page }) => {
  const { email } = await pending(page);
  await local(page, 'Guest retained');
  const other = `account-other-${crypto.randomUUID()}@example.com`;
  await login(page, other, true); await local(page, 'Other owner retained');
  await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click(); await expect(page.getByTestId('sync-state')).toContainText('synced');
  await login(page, email); await page.goto('/profile');
  await page.getByRole('button', { name: 'Xóa tài khoản', exact: true }).click();
  await page.getByLabel(removeLabel, { exact: true }).check();
  await page.getByLabel('Nhập XÓA để xác nhận', { exact: true }).fill('XÓA');
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/); await page.goto('/offline');
  expect((await records(page)).map(value => value.name).sort()).toEqual(['Guest retained', 'Other owner retained']);
  await login(page, other); await page.getByLabel('Project đã lưu', { exact: true }).selectOption({ label: 'Other owner retained' });
  await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click(); await expect(page.getByTestId('sync-state')).toContainText('synced');
});

test('an account switch in another tab cannot confirm a stale logout dialog as the new owner', async ({ page, context }) => {
  await pending(page); await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  const other = await context.newPage();
  let logouts = 0; context.on('request', request => { if (request.url().endsWith('/auth/logout')) logouts++; });
  try {
    await other.goto('/offline'); await expect(other.locator('.connection-bar')).toContainText('Đã xác thực');
    const email = `switched-${crypto.randomUUID()}@example.com`; await login(other, email, true);
    await expect(page.locator('.connection-bar')).toContainText(email);
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Tài khoản đã thay đổi');
    expect(logouts).toBe(0); await expect(other.locator('.connection-bar')).toContainText(email);
  } finally { await other.close(); }
});

test('offline reload permits local signout and reconnect does not silently restore the cookie session', async ({ page, context }) => {
  const { email } = await pending(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Đăng xuất trên thiết bị', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('phiên server chưa được thu hồi');
  let refreshes = 0; page.on('request', request => { if (request.url().endsWith('/auth/refresh')) refreshes++; });
  await context.setOffline(false); await page.reload();
  await expect(page.locator('.connection-bar')).toContainText('Chưa đăng nhập'); expect(refreshes).toBe(0);
  await login(page, email); await expect(page.getByTestId('sync-state')).toContainText('0/1');
});

test('expired session during autosave keeps the draft and explicit recovery after login saves it once', async ({ page }) => {
  const { email, project } = await pending(page);
  await page.goto(`/projects/${project}`); await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toBeVisible();
  let rejected = false, refreshes = 0, committed = 0;
  await page.route('**/api/v1/projects/*/workspace', async route => {
    if (!rejected) { rejected = true; await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_EXPIRED', message: 'Phiên hết hạn' } }) }); }
    else { committed++; await route.continue(); }
  });
  await page.route('**/api/v1/auth/refresh', route => { refreshes++; return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTH_REFRESH_INVALID', message: 'Phiên hết hạn' } }) }); });
  await page.getByLabel('Số dòng/trang', { exact: true }).selectOption('25'); await expect(page).toHaveURL(/\/login$/);
  expect(refreshes).toBe(1); expect(committed).toBe(0);
  await page.unroute('**/api/v1/auth/refresh');
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
  await expect(page.getByRole('heading', { name: 'Có bản nháp chưa được xác nhận', exact: true })).toBeVisible();
  await expect(page.getByLabel('Số dòng/trang', { exact: true })).toHaveValue('10');
  await page.getByRole('button', { name: 'Khôi phục bản nháp', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Đã lưu workspace'); expect(committed).toBe(1);
  await page.reload(); await expect(page.getByLabel('Số dòng/trang', { exact: true })).toHaveValue('25');
});

test('expired auth during sync stops with a durable Apply key and explicit login resumes without duplicate history', async ({ page }) => {
  const { email } = await pending(page);
  const keys: string[] = []; let expired = false;
  await page.route('**/api/v1/datasets/*/operations', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    keys.push(route.request().headers()['idempotency-key']);
    if (!expired) { expired = true; await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_EXPIRED', message: 'Phiên hết hạn' } }) }); }
    else await route.continue();
  });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTH_REFRESH_INVALID', message: 'Phiên hết hạn' } }) }));
  await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click(); await expect(page.getByTestId('sync-state')).toContainText('blocked');
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('A');
  await page.unroute('**/api/v1/auth/refresh'); await login(page, email);
  await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click(); await expect(page.getByTestId('sync-state')).toContainText('synced · 1/1');
  expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]);
  const project = await page.getByTestId('server-project').innerText(); await page.goto(`/projects/${project}`);
  await openStep(page,'history');await expect(page.getByRole('heading', { name: 'Lịch sử phiên bản', exact: true })).toBeVisible();
  await openStep(page,'history');await expect(page.getByRole('region', { name: 'Lịch sử phiên bản', exact: true }).locator('ol.history-list > li')).toHaveCount(2);
});
