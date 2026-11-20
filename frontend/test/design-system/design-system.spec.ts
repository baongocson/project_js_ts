import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

const fixture = '/test/design-system/fixture.html';
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: controls, contrast, focus, dialog and responsive surfaces`, async ({ page }) => {
    await page.goto(fixture);
    await page.locator('html').evaluate((element, value) => { element.dataset.theme = value; }, theme);
    const primary = page.getByRole('button', { name: 'Thao tác chính', exact: true });
    const contrast = await primary.evaluate(element => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const a = luminance(style.color);
      const colors = style.backgroundImage.match(/rgb\([^)]+\)/g) ?? [style.backgroundColor];
      return Math.min(...colors.map(color => { const b = luminance(color); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    const normal = await primary.evaluate(element => getComputedStyle(element).backgroundColor);
    await primary.hover(); await page.waitForTimeout(220);
    expect(await primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(normal);
    const disabled = page.getByRole('button', { name: 'Chưa khả dụng', exact: true });
    await expect(disabled).toBeDisabled();
    expect(await disabled.evaluate(element => getComputedStyle(element).opacity)).toBe('1');
    expect(await disabled.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none');
    await expect(page.getByLabel('Trường có lỗi', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    expect(await page.getByLabel('Trường có lỗi', { exact: true }).evaluate(element => getComputedStyle(element).borderColor)).toBe(theme === 'dark' ? 'rgb(251, 113, 133)' : 'rgb(190, 18, 60)');
    const checkbox = page.getByRole('checkbox', { name: 'Hiển thị chú giải' });
    await expect(checkbox).toBeChecked(); await checkbox.uncheck(); await expect(checkbox).not.toBeChecked();
    await page.keyboard.press('Tab'); await primary.focus();
    expect(await primary.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    const opener = page.getByRole('button', { name: 'Mở hộp thoại mẫu', exact: true });
    await opener.click(); await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Tên trong hộp thoại')).toBeFocused();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(opener).toBeFocused();
    for (const width of [375, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${theme}-${width}.png`), fullPage: true });
    }
  });
}

test('real theme effect preserves system mode and stored light/dark choices', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_INVALID', message: 'UI test không có phiên' } }) }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('fe-theme'))).toBe('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  for (const saved of ['dark', 'light']) {
    await page.evaluate(value => localStorage.setItem('fe-theme', value), saved);
    await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', saved);
    expect(await page.evaluate(() => localStorage.getItem('fe-theme'))).toBe(saved);
  }
});

test('reduced motion disables authored control transitions and cell focus remains visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(fixture);
  const primary = page.getByRole('button', { name: 'Thao tác chính', exact: true });
  expect((await primary.evaluate(element => getComputedStyle(element).transitionDuration)).split(',').every(value => parseFloat(value) === 0)).toBe(true);
  await primary.hover();
  expect(await primary.evaluate(element => getComputedStyle(element).transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#content')).toBeFocused();
  await page.keyboard.press('Tab');
  const cell = page.getByRole('button', { name: 'Ô doanh thu' }); await cell.focus();
  expect(await cell.evaluate(element => getComputedStyle(element).outlineWidth)).toBe('3px');
});

test('local import, table and keyboard SVG fallback remain usable with the dark design system', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_INVALID', message: 'UI test không có phiên' } }) }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/offline');
  await page.getByLabel('Tên project', { exact: true }).fill('Design system · Local smoke');
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'design-system.csv', mimeType: 'text/csv', buffer: Buffer.from('x,y,z,label\n1,2,3,a\n2,3,4,b\n3,4,5,c\n') });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await expect(page.getByTestId('analysis-summary')).toContainText('3Dòng toàn dataset');
  await expect(page.getByRole('button', { name: 'Dòng 2, cột x', exact: true })).toHaveText('2');
  expect(await page.getByLabel('Cột filter', { exact: true }).evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(100);
  await page.getByRole('button', { name: 'Không gian 3D', exact: true }).click();
  await expect(page.getByTestId('points-counts')).toContainText('3/3');
  await page.getByRole('button', { name: 'Dùng hình chiếu tương thích', exact: true }).click();
  const point = page.locator('circle[data-point][tabindex="0"]');
  await expect(point).toHaveCount(1); await point.focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('analysis-selected-row')).toBeVisible();
  await page.getByLabel('Sửa ô x',{exact:true}).fill('9');
  await page.getByRole('button',{name:'Lưu ô x',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 1, cột x',exact:true})).toHaveText('9');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('local-workspace-dark-mobile.png'), fullPage: true });
});

 test('shell theme control, mobile navigation and protected routes preserve existing behavior', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_INVALID', message: 'No test session' } }) }));
  await page.goto('/login');
  await page.getByLabel('Giao diện', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload(); await expect(page.getByLabel('Giao diện', { exact: true })).toHaveValue('dark');
  await page.getByLabel('Giao diện', { exact: true }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Giao diện', { exact: true }).selectOption('system');
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 375, height: 844 });
  const toggle = page.getByRole('button', { name: /Điều hướng/ });
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeHidden();
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.screenshot({path:test.info().outputPath('app-shell-mobile.png'),fullPage:false});
  await page.getByRole('link', { name: 'Dữ liệu offline', exact: true }).click();
  await expect(page).toHaveURL(/\/offline$/); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click(); await page.getByRole('link', { name: 'Projects online' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('local analytics table, processing preview/apply and history preserve real stored values', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SESSION_INVALID', message: 'No test session' } }) }));
  await page.goto('/offline');
  await page.getByLabel('Tên project', { exact: true }).fill('Neon regression');
  await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'regression.csv', mimeType: 'text/csv', buffer: Buffer.from('n,t\n1,a\n2,b\n3,c\n') });
  await page.getByRole('button', { name: 'Lưu offline', exact: true }).click();
  await expect(page.getByTestId('analysis-summary')).toContainText('3Dòng toàn dataset');
  await page.getByLabel('Cột filter', { exact: true }).selectOption({ label: 'n' });
  await page.getByLabel('Điều kiện filter', { exact: true }).selectOption('gt');
  await page.getByLabel('Giá trị filter', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Lọc', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dòng 1, cột n', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('analysis-summary')).toContainText('3Dòng toàn dataset');
  await page.getByRole('button', { name: 'Bỏ lọc', exact: true }).click();
  await page.locator('.section-tabs button[data-step="cleaning"]').click();
  await page.getByLabel('Phương pháp', { exact: true }).selectOption('uppercase');
  await page.getByLabel('Các cột xử lý', { exact: true }).selectOption({ label: 't' });
  await page.getByRole('button', { name: 'Xem trước thay đổi', exact: true }).click();
  await expect(page.getByTestId('processing-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('a');
  await page.getByRole('button', { name: 'Áp dụng offline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('A');
  await page.locator('.section-tabs button[data-step="history"]').click();
  await expect(page.getByRole('heading', { name: 'Lịch sử local', exact: true })).toBeVisible();
  await expect(page.locator('.history-list li')).toHaveText(['Bước 1 · uppercase']);
  await page.reload();
  await page.locator('.section-tabs button[data-step="collection"]').click();
  await expect(page.getByRole('button', { name: 'Dòng 1, cột t', exact: true })).toHaveText('A');
  await page.locator('.section-tabs button[data-step="history"]').click();
  await page.getByRole('button',{name:'Khôi phục offline',exact:true}).click();
  await page.locator('.section-tabs button[data-step="collection"]').click();
  await expect(page.getByRole('button',{name:'Dòng 1, cột t',exact:true})).toHaveText('a');
});

test('numeric legend, SVG colors and keyboard selection share the same display mapping', async ({ page }) => {
  await page.goto('/test/design-system/visualization.html?count=100');
  await page.locator('html').evaluate(element => { element.dataset.theme = 'dark'; });
  await page.getByRole('button', { name: 'Dùng hình chiếu tương thích', exact: true }).click();
  await page.getByLabel('Màu hiển thị', { exact: true }).selectOption('x');
  await expect(page.getByLabel('Chú giải màu điểm')).toContainText('0 → 99');
  await expect(page.locator('circle[data-point="r-0"]')).toHaveAttribute('fill', '#22d3ee');
  await expect(page.locator('circle[data-point="r-99"]')).toHaveAttribute('fill', '#e879f9');
  const first=page.locator('circle[data-point="r-0"]'); await first.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Dòng đã chọn')).toHaveText('r-1');
  await expect(page.locator('circle[data-point="r-1"]')).toHaveAttribute('aria-pressed','true');
  await page.getByLabel('Màu hiển thị', { exact: true }).selectOption('none');
  await page.getByLabel('Màu điểm kiểm thử').selectOption('missing');
  await expect(first).toHaveAttribute('fill','#fbbf24');
  await page.getByLabel('Màu điểm kiểm thử').selectOption('outlier');
  await expect(first).toHaveAttribute('fill','#fb7185');
  await page.locator('html').evaluate(element => { element.dataset.theme = 'light'; });
  await expect(first).toHaveAttribute('fill','#b73350');
  await page.screenshot({path:test.info().outputPath('svg-light.png'),fullPage:true});
});

test('WebGL initializes, camera controls work, and context restoration preserves fallback access', async ({ page }) => {
  await page.goto('/test/design-system/visualization.html?count=1000');
  await page.locator('html').evaluate(element => { element.dataset.theme = 'dark'; });
  const scene=page.getByTestId('webgl-scene');
  await expect(scene).toHaveAttribute('data-ready','true',{timeout:20000});
  await page.getByRole('button',{name:'Xoay phải',exact:true}).click();
  await page.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();
  const box=await scene.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const camera=new PerspectiveCamera(44,box!.width/box!.height,.1,1000);
  camera.position.set(Math.sin(Math.PI/4)*17,17*.65,Math.cos(Math.PI/4)*17);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  camera.setViewOffset(box!.width, box!.height, 0, box!.height * .05, box!.width, box!.height);
  const projected=new Vector3(-4,0,4).project(camera);
  await page.mouse.move(box!.x+(projected.x+1)*box!.width/2,box!.y+(1-projected.y)*box!.height/2);
  await expect(scene).not.toHaveAttribute('data-active-row','');
  await page.mouse.click(box!.x+(projected.x+1)*box!.width/2,box!.y+(1-projected.y)*box!.height/2);
  await expect(page.getByLabel('Dòng đã chọn')).not.toHaveText('Chưa chọn');
  await expect(scene.locator('.scene-tooltip')).toContainText('Đã ghim');
  await page.getByRole('checkbox',{name:'Chiếu điểm xuống mặt phẳng'}).check();
  await page.getByRole('button',{name:'Bỏ ghim',exact:true}).click();
  await page.getByLabel('Màu hiển thị',{exact:true}).selectOption('z');
  await expect(page.getByLabel('Chú giải màu điểm')).toContainText('-50 → 50');
  await page.screenshot({path:test.info().outputPath('webgl-dark.png'),fullPage:true});
  const supported=await scene.locator('canvas').evaluate(element=>{
    const gl=(element as HTMLCanvasElement).getContext('webgl2'); const ext=gl?.getExtension('WEBGL_lose_context');
    if(!ext)return false; ext.loseContext(); setTimeout(()=>ext.restoreContext(),1000); return true;
  });
  expect(supported).toBe(true);
  await expect(scene).toHaveAttribute('data-ready','false');
  await expect(scene).toHaveAttribute('data-ready','true',{timeout:15000});
  await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
  await expect(page.locator('circle[data-point]')).toHaveCount(1000);
});

test('unavailable WebGL is contained and SVG remains keyboard accessible', async ({ page }) => {
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,type:string,...args:unknown[]){return type.startsWith('webgl')?null:Reflect.apply(original,this,[type,...args]);}});
  });
  await page.goto('/test/design-system/visualization.html?count=100');
  await expect(page.getByRole('heading',{name:/Fixture visualization/})).toBeVisible();
  await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
  await expect(page.locator('circle[data-point]')).toHaveCount(100);
  await page.locator('circle[data-point][tabindex="0"]').focus();await page.keyboard.press('Enter');
  await expect(page.getByLabel('Dòng đã chọn')).toHaveText('r-0');
});

for(const [count,width] of [[100,375],[1000,768],[4000,1366],[10000,1920]]) {
  test(`render workload ${count} points at ${width}px in WebGL and SVG`,async({page})=>{
    const started=Date.now();
    await page.setViewportSize({width,height:1000});
    await page.goto(`/test/design-system/visualization.html?count=${count}`);
    await page.locator('html').evaluate(element=>{element.dataset.theme='dark';});
    await expect(page.getByTestId('webgl-scene')).toHaveAttribute('data-ready','true',{timeout:20000});
    await page.getByRole('button',{name:'Xoay phải',exact:true}).click();
    await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
    await expect(page.locator('circle[data-point]')).toHaveCount(count);
    await page.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('circle[data-point][tabindex="0"]').focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
    await expect(page.getByLabel('Dòng đã chọn')).toHaveText(`r-${count-1}`);
    test.info().annotations.push({type:'workload-ms',description:String(Date.now()-started)});
    await page.screenshot({path:test.info().outputPath(`workload-${count}-${width}.png`),fullPage:true});
  });
}

test('forced colors retain readable heading, visible selected cell and control border',async({page})=>{
  await page.emulateMedia({forcedColors:'active'});await page.goto(fixture);
  expect(await page.locator('h1').evaluate(element=>getComputedStyle(element).color)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await page.locator('td.selected').evaluate(element=>getComputedStyle(element).outlineWidth)).toBe('2px');
  expect(await page.getByRole('button',{name:'Thao tác chính',exact:true}).evaluate(element=>getComputedStyle(element).borderStyle)).toBe('solid');
});

test('project CRUD and account theme controls keep their existing frontend API contracts (stubbed server)',async({page})=>{
  let user={_id:'ui-owner',email:'ui@example.com',displayName:'UI fixture',preferences:{theme:'system'}};
  let project={_id:'ui-project',name:'Project kiểm thử UI',lifecycle:'empty',updatedAt:'2026-11-18T00:00:00.000Z'};
  let exists=true,createdKey='';
  const workspace={_id:'ui-workspace',revision:0,boundVersionId:null,updatedAt:project.updatedAt,activeTab:'collection',chartConfig:{xColumnId:null,yColumnId:null,zColumnId:null,colorMode:'normal',outlierColumnIds:[],outlierMethod:'iqr',threshold:1.5},selection:{columnIds:[],cell:null},tableState:{page:1,pageSize:10,sort:null,filters:[]}};
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
    const json=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(path.endsWith('/auth/refresh'))return json({accessToken:'fixture-only-token',expiresIn:3600});
    if(path.endsWith('/users/me')){
      if(method==='PATCH'){const patch=request.postDataJSON() as {preferences:{theme:string}};user={...user,preferences:patch.preferences};}
      return json(user);
    }
    if(path.endsWith('/projects')){
      if(method==='POST'){project={...project,name:(request.postDataJSON() as {name:string}).name};exists=true;createdKey=request.headers()['idempotency-key'];return json({project},201);}
      return json({items:exists?[project]:[],page:1,limit:12,total:exists?1:0});
    }
    if(path.endsWith('/projects/ui-project')){
      if(method==='DELETE'){exists=false;return route.fulfill({status:204});}
      if(method==='PATCH'){project={...project,name:(request.postDataJSON() as {name:string}).name};return json(project);}
      return json({project,workspace,dataset:null,workspaceAdjusted:false,adjustments:[]});
    }
    return json({error:{code:'UNEXPECTED_TEST_REQUEST',message:path}},404);
  });
  await page.goto('/projects');await expect(page.getByRole('heading',{name:project.name,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Đổi tên',exact:true}).click();await page.getByLabel('Tên project',{exact:true}).fill('Tên mới');await page.getByRole('button',{name:'Lưu tên',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Tên mới',exact:true})).toBeVisible();
  await page.getByLabel('Giao diện',{exact:true}).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect.poll(()=>page.getByRole('button',{name:'Đổi tên',exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(23, 37, 61)');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:test.info().outputPath('projects-shell.png'),fullPage:true});
  await page.getByRole('button',{name:'Xóa',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa project',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chưa có project',exact:true})).toBeVisible();
  await page.getByLabel('Tên project mới',{exact:true}).fill('Tạo mới');await page.getByRole('button',{name:'Tạo project',exact:true}).click();
  await expect(page).toHaveURL(/\/projects\/ui-project$/);expect(createdKey).toBeTruthy();
  await expect(page.getByRole('heading',{name:'Tạo mới',exact:true})).toBeVisible();
  await page.getByLabel('Giao diện',{exact:true}).selectOption('dark');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');expect(user.preferences.theme).toBe('dark');
  await page.goto('/profile');await expect(page.getByRole('heading',{name:'Hồ sơ tài khoản',exact:true})).toBeVisible();
  for(const width of [375,768,1366,1920]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('auth scene and spotlight follow theme, pointer and reduced motion without moving the form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, json: {} }));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      return kind.startsWith('webgl') ? null : Reflect.apply(getContext, this, [kind, ...args]);
    } as typeof getContext;
  });
  await page.goto('/login');
  const scene = page.locator('.auth-scene');
  const planet = scene.locator('.planet-main');
  const spotlight = page.locator('.pointer-spotlight');
  const email = page.getByLabel('Email', { exact: true });
  await expect(scene).toBeVisible();
  await expect(scene.locator('.auth-scene-depth')).toHaveAttribute('aria-hidden', 'true');
  await expect(planet).toHaveCSS('animation-name', 'planet-drift');
  const darkLight = await planet.evaluate(element => getComputedStyle(element).backgroundImage);
  await page.locator('#content').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  const formPosition = await email.boundingBox();
  await page.mouse.move(880, 360);
  await expect(spotlight).toHaveAttribute('data-pointer-lit', '');
  await expect(spotlight).toHaveCSS('--spot-x', '880px');
  await expect(scene.locator('.auth-scene-depth')).not.toHaveCSS('--parallax-x', '');
  expect(await email.boundingBox()).toEqual(formPosition);
  await email.fill('guest@example.com');
  await page.getByLabel('Giao diện', { exact: true }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(planet).not.toHaveCSS('background-image', darkLight);
  await expect(page.getByRole('link', { name: 'Làm việc trên máy' })).toHaveCSS('color', 'rgb(118, 80, 12)');
  await page.screenshot({ path: test.info().outputPath('premium-login-light.png'), animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(spotlight).not.toHaveAttribute('data-pointer-lit', '');
  await expect(planet).toHaveCSS('animation-name', 'none');
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(scene).toBeHidden();
  await expect(page.getByRole('link', { name: 'Làm việc trên máy' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
