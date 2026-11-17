import { chooseMethod, ensureProcessing } from './workspace-navigation';
import { test,expect } from '@playwright/test';
test('keyboard validation, modal focus return and long content fit mobile and desktop in light/dark themes',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/register');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Đến nội dung',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#content')).toBeFocused();
  await page.getByLabel('Email',{exact:true}).fill('invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill('short');await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('different');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('aria-invalid','true');await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('aria-invalid','true');await expect(page.getByLabel('Nhập lại mật khẩu',{exact:true})).toHaveAttribute('aria-invalid','true');
  const email=`ui-quality-${crypto.randomUUID()}@example.com`,password='quality-password-123';await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
  const name='A'.repeat(100);await page.getByLabel('Tên project mới',{exact:true}).fill(name);await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'long-header.csv',mimeType:'text/csv',buffer:Buffer.from(`n,${'LongColumn'.repeat(8)}\n1,a\n2,b\n`)});await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 2, cột n',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('workspace-mobile-light.png'),fullPage:true});await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:test.info().outputPath('workspace-desktop-dark.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('link',{name:'Projects online',exact:true}).click();const rename=page.getByRole('button',{name:'Đổi tên',exact:true});await rename.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();expect(await dialog.evaluate(element=>element.matches(':modal'))).toBe(true);await expect(page.getByLabel('Tên project',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await page.keyboard.press('Tab');expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(rename).toBeFocused();
  await page.setViewportSize({width:390,height:844});await rename.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath('project-dialog-mobile-dark.png'),fullPage:true});await page.keyboard.press('Escape');
});

test('auth, profile, dashboard, local preview, sync and 3D remain usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const path of ['/register', '/login', '/projects', '/offline', '/system', '/missing-route']) {
    await page.goto(path); await expect(page.locator('.connection-bar')).not.toContainText('Đang khôi phục'); await fits();
    await page.screenshot({ path: test.info().outputPath(`${path.slice(1)}-mobile.png`) });
  }
  await page.goto('/offline');
  const email = `visual-${crypto.randomUUID()}@example.com`, password = 'visual-password-123';
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Đã đăng ký');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
  await page.getByLabel('Tên project', { exact: true }).fill('Local workspace · 5.000 dòng');
  const csv = 'x,y,z,label\n' + Array.from({ length: 5000 }, (_, i) => `${i + 1},${(i % 23) + 2},${(i % 43) + 3},group${i % 4}\n`).join('');
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'visual.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await expect(page.getByTestId('analysis-summary')).toContainText('5000Dòng toàn dataset'); await fits();
  await ensureProcessing(page);await page.getByLabel('Các cột xử lý', { exact: true }).selectOption({ label: 'label' });
  await chooseMethod(page,'uppercase');
  await page.getByRole('button', { name: 'Xem trước thay đổi', exact: true }).click();
  await expect(page.getByTestId('processing-preview')).toBeVisible(); await fits();
  await page.getByRole('region', { name: 'Xử lý dữ liệu', exact: true }).screenshot({ path: test.info().outputPath('local-preview-mobile.png') });
  await page.getByRole('button', { name: 'Áp dụng offline', exact: true }).click(); await expect(page.getByTestId('sync-state')).toContainText('0/1');
  await page.getByRole('region', { name: 'Trung tâm đồng bộ', exact: true }).screenshot({ path: test.info().outputPath('sync-center-mobile.png') });
  await page.getByRole('button', { name: 'Không gian 3D', exact: true }).click();
  for (const [axis, column] of [['X', 'x'], ['Y', 'y'], ['Z', 'z']]) await page.getByLabel(`Trục ${axis}`, { exact: true }).selectOption({ label: column });
  await page.getByLabel('Tối đa điểm hiển thị', { exact: true }).selectOption('4000');
  await expect(page.getByTestId('points-counts')).toContainText('4000/5000'); await fits();
  await expect(page.getByTestId('webgl-scene')).toHaveAttribute('data-ready','true');await page.getByTestId('webgl-scene').screenshot({path:test.info().outputPath('webgl-mobile.png')});
  await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
  const points=page.locator('circle[data-point]');await expect(points.locator('xpath=..').first()).toBeVisible();await expect(page.locator('circle[data-point][tabindex="0"]')).toHaveCount(1);
  const first=await page.locator('circle[data-point][tabindex="0"]').getAttribute('data-point');await page.locator('circle[data-point][tabindex="0"]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('circle[data-point][tabindex="0"]')).not.toHaveAttribute('data-point',first!);await page.keyboard.press('Enter');await expect(page.getByTestId('analysis-selected-row')).toBeVisible();
  await page.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).focus();
  const scene = page.getByRole('region', { name: 'Phân tích dữ liệu', exact: true });
  await scene.screenshot({ path: test.info().outputPath('local-3d-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 }); await fits();
  await scene.screenshot({ path: test.info().outputPath('local-3d-desktop.png') });
  await page.goto('/projects'); await expect(page.locator('.connection-bar')).toContainText(email); await fits(); await page.screenshot({ path: test.info().outputPath('projects-empty-desktop.png') });
  await page.goto('/profile'); await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Hồ sơ tài khoản', exact: true })).toBeVisible(); await fits();
  await page.screenshot({ path: test.info().outputPath('profile-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await fits();
  await page.screenshot({ path: test.info().outputPath('account-dialog-mobile.png') });
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});
