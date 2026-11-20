import { test, expect, type Page } from '@playwright/test';

async function openAnalysis(page: Page, csv: string) {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/offline');
  await page.getByLabel('Tên project', { exact: true }).fill('Analysis QA');
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'analysis.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await page.getByRole('button', { name: 'Phân phối và tần suất', exact: true }).click();
  return page.getByTestId('analysis-distribution');
}

test('Analysis links bars with global Top 7 and Other while retaining the full-row denominator', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const csv = 'value,group\n' + Array.from({ length: 3010 }, (_, i) =>
    i + ',' + (i >= 3000 ? '' : 'G' + String(i % 30).padStart(2, '0'))).join('\n');
  const analysis = await openAnalysis(page, csv);
  await page.getByLabel('Cột phân phối', { exact: true }).selectOption({ label: 'group' });
  const legend = analysis.locator('.analysis-donut-legend');
  const other = legend.getByRole('button', { name: /Khác/ });
  const bar = analysis.getByRole('button', { name: /^G10 · 100 dòng/ });
  await expect(other).toContainText('76,41');
  await expect(legend.getByRole('button', { name: /Nhóm missing/ })).toContainText('0,33');
  const box = (await analysis.boundingBox())!;
  const boxplot = (await page.getByTestId('boxplot-panel').boundingBox())!;
  expect(boxplot.y + boxplot.height).toBeLessThan(box.y);
  expect(boxplot.height).toBeLessThan(box.height);
  await bar.hover();
  await expect(other).toHaveAttribute('data-active', 'true');
  await expect(analysis.locator('.analysis-chart-detail').first()).toContainText('100 dòng · 3,32');
  expect((await analysis.boundingBox())?.height).toEqual(box.height);
  await other.hover();
  await expect(bar).toHaveAttribute('data-active', 'true');
  const firstSegment = analysis.locator('.analysis-donut-segment').first();
  await firstSegment.scrollIntoViewIfNeeded();
  const point = await firstSegment.evaluate(element => {
    const circle = element as SVGCircleElement;
    const percent = Number(circle.getAttribute('stroke-dasharray')?.split(' ')[0]);
    const position = circle.getPointAtLength(circle.getTotalLength() * percent / 200)
      .matrixTransform(circle.getScreenCTM()!);
    return { x: position.x, y: position.y };
  });
  await page.mouse.move(point.x, point.y);
  await expect(analysis.getByRole('button', { name: /^G00 · 100 dòng/ })).toHaveAttribute('data-active', 'true');
  await analysis.getByRole('heading', { name: 'Bảng tần suất' }).hover();
  await expect(bar).toHaveAttribute('data-active', 'false');

  await page.getByLabel('Sắp xếp category', { exact: true }).selectOption('value');
  await expect(other).toContainText('76,41');
  await analysis.getByRole('button', { name: 'Category sau' }).click();
  await expect(other).toContainText('76,41');
  await page.getByRole('checkbox', { name: 'Gồm nhóm missing', exact: true }).uncheck();
  await expect(legend.getByRole('button', { name: /Nhóm missing/ })).toHaveCount(0);
  await expect(analysis.getByText(/Mẫu số vẫn gồm các dòng này/)).toContainText('10 dòng missing');
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByLabel('Giao diện', { exact: true }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Histogram supports keyboard and exact rates; Boxplot uses complete numeric values', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const analysis = await openAnalysis(page, 'x,y\n0,0\n2,0\n4,0\n,0\n');
  const stats = page.getByTestId('boxplot-panel');
  await expect(stats.locator('dl > div').filter({ has: page.getByText('Mean', { exact: true }) })).toContainText('2');
  await expect(stats.locator('dl > div').filter({ has: page.getByText('Độ lệch chuẩn', { exact: true }) })).toContainText('1,63299');
  await page.getByLabel('Số khoảng histogram', { exact: true }).selectOption('5');
  const bins = analysis.getByRole('group', { name: 'Histogram phân phối toàn cột' }).getByRole('button');
  await expect(bins).toHaveCount(5);
  await bins.first().focus();
  await page.keyboard.press('Tab');
  await expect(bins.nth(1)).toBeFocused();
  await expect(bins.nth(1)).toHaveAttribute('data-active', 'true');
  await expect(analysis.getByRole('tooltip')).toContainText('0 dòng · 0');
  await expect(bins.nth(1).locator('.analysis-bar-ink')).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await expect(analysis.getByRole('tooltip')).toHaveCount(0);
  await page.getByLabel('Cột boxplot', { exact: true }).selectOption({ label: 'y' });
  await expect(stats.locator('dl > div').filter({ has: page.getByText('Độ lệch chuẩn', { exact: true }) }).locator('dd')).toContainText('0');
});

test('Header-only input has empty charts and no invented statistics', async ({ page }) => {
  const analysis = await openAnalysis(page, 'name,count\n');
  await expect(analysis.getByText('Không có nhóm để vẽ Donut.')).toBeVisible();
  await expect(analysis.getByText('Không có category.', { exact: true })).toBeVisible();
});

test.describe('touch charts', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 840 } });
  test('a tap pins a frequency group and a second tap clears it', async ({ page }) => {
    const analysis = await openAnalysis(page, 'group,value\nalpha,0\nbeta,1\nalpha,2\n');
    const bar = analysis.getByRole('button', { name: /^alpha · 2 dòng/ });
    const legend = analysis.locator('.analysis-donut-legend').getByRole('button', { name: /^alpha/ });
    await bar.tap();
    await expect(legend).toHaveAttribute('data-active', 'true');
    await expect(analysis.locator('.analysis-chart-detail').last()).toContainText('66,67');
    await bar.tap();
    await expect(legend).toHaveAttribute('data-active', 'false');
  });
});
