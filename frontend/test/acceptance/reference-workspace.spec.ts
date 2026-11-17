import { test, expect } from '@playwright/test';
import { openStep, chooseMethod } from './workspace-navigation';

test('reference layout: grouped steps, WebGL offline, projection, typed preview and history keep current semantics', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/offline');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  // Go offline before opening the lazy renderer: every build chunk must already be cached.
  await context.setOffline(true);
  await page.getByLabel('Tên project', { exact: true }).fill('Khám phá dữ liệu · Giao diện mẫu');
  const csv = 'x,y,z,label\n' + Array.from({ length: 60 }, (_, i) => `${i+1},${i%9},${i%13},${i%2?'a':'  b  '}\n`).join('');
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'reference.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await expect(page.getByTestId('analysis-summary')).toContainText('60Dòng toàn dataset');
  await expect(page.locator('.section-tabs button')).toHaveCount(8);
  await expect(page.getByLabel('Biểu đồ missing theo cột', { exact: true })).toBeVisible();
  await page.locator('.workspace-layout').screenshot({ path: test.info().outputPath('reference-collection-desktop.png') });
  await openStep(page, 'cleaning');
  const options = page.getByLabel('Phương pháp', { exact: true }).locator('option');
  expect(await options.evaluateAll(elements => elements.map(element => (element as HTMLOptionElement).value))).toEqual([
    'normalize_whitespace','remove_duplicates','strip_html','uppercase','lowercase','replace_value','convert_number','convert_text','convert_date','convert_datetime','convert_boolean',
  ]);
  await expect(page.getByTestId('webgl-scene')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('webgl-scene').screenshot({ path: test.info().outputPath('reference-webgl.png') });
  await page.getByText('Chọn điểm bằng danh sách', { exact: true }).click();
  const list = page.getByLabel('Dòng tại điểm 3D', { exact: true });
  await list.selectOption({ index: 12 });
  await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 12');
  await page.getByRole('button',{name:'Ghim dòng đang chọn',exact:true}).click();
  await expect(page.getByTestId('webgl-scene')).toContainText('Đã ghim');
  await page.getByLabel('Chiếu điểm xuống mặt phẳng', { exact: true }).check();
  await page.getByRole('button', { name: 'Xoay phải', exact: true }).click();
  const scene = await page.getByTestId('webgl-scene').boundingBox();
  expect(scene).not.toBeNull();
  if (scene) { await page.mouse.move(scene.x+scene.width/2,scene.y+scene.height/2); await page.mouse.down(); await page.mouse.move(scene.x+scene.width/2+70,scene.y+scene.height/2+20); await page.mouse.up(); }
  await page.getByRole('button', { name: 'Đặt lại góc nhìn', exact: true }).click();
  const layout = await page.locator('.product-grid').evaluate(element => {
    const boxes = [...element.children].map(child => child.getBoundingClientRect());
    return { sideBySide: boxes.length === 2 && boxes[0].right <= boxes[1].left };
  });
  expect(layout.sideBySide).toBe(true);
  await chooseMethod(page, 'uppercase');
  await page.getByLabel('Các cột xử lý', { exact: true }).selectOption({ label: 'label' });
  await page.getByRole('button', { name: 'Xem trước thay đổi', exact: true }).click();
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await expect(page.locator('.workspace-preview-host [data-testid="processing-preview"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dòng 2, cột label', exact: true })).toHaveText('a');
  await page.locator('.workspace-layout').screenshot({ path: test.info().outputPath('reference-cleaning-preview-desktop.png') });
  await page.getByRole('button',{name:'Hủy bản xem trước',exact:true}).click();
  await expect(page.getByTestId('processing-preview')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Dòng 2, cột label',exact:true})).toHaveText('a');
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.product-grid').screenshot({ path: test.info().outputPath('reference-cleaning-mobile.png') });
  await page.getByRole('button', { name: 'Áp dụng offline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dòng 2, cột label', exact: true })).toHaveText('A');
  await openStep(page, 'missing');
  await expect(page.getByLabel('Màu điểm', { exact: true })).toHaveValue('missing');
  await expect(page.getByLabel('Phương pháp', { exact: true })).toHaveValue('fill_constant');
  expect(await page.getByLabel('Phương pháp', { exact: true }).locator('option').count()).toBe(7);
  await openStep(page, 'outliers');
  await expect(page.getByLabel('Màu điểm', { exact: true })).toHaveValue('outlier');
  for (const [step, method] of [['scaling','scale_minmax'],['transformation','log1p'],['encoding','one_hot']] as const) {
    await openStep(page, step); await expect(page.getByLabel('Phương pháp', { exact: true })).toHaveValue(method);
  }
  await openStep(page, 'history'); await expect(page.getByRole('heading', { name: 'Lịch sử local', exact: true })).toBeVisible();
  await expect(page.getByText('Đã lưu workspace local',{exact:true})).toBeVisible();
  await page.reload(); await expect(page.locator('.section-tabs button[data-step="history"]')).toHaveAttribute('aria-current', 'page');
  await openStep(page, 'collection'); await page.getByLabel('Số dòng/trang', { exact: true }).selectOption('25');
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dòng 26, cột x', exact: true })).toBeVisible();
});

test('a failed WebGL chunk falls back to accessible projection and still resolves the selected row', async ({ browser, baseURL }) => {
  const context=await browser.newContext({baseURL,ignoreHTTPSErrors:true,serviceWorkers:'block'}),page=await context.newPage();
  try {
    await page.route('**/assets/WebGLScatter-*.js',route=>route.abort('failed'));
    await page.goto('/offline');
    await page.getByLabel('Tên project',{exact:true}).fill('Fallback rendering');
    await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'fallback.csv',mimeType:'text/csv',buffer:Buffer.from('x,y,z\n1,2,3\n2,3,4\n')});
    await page.getByRole('button',{name:'Lưu offline',exact:true}).click();
    await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();
    await expect(page.getByText('WebGL không khả dụng.',{exact:false})).toBeVisible();
    const first=page.locator('circle[data-point]').first();await first.focus();await page.keyboard.press('Enter');
    await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 1');
    await expect(page.getByRole('button',{name:'Dòng 2, cột x',exact:true})).toHaveText('2');
  } finally {await context.close();}
});
