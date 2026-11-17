import { chooseMethod, ensureProcessing, openStep } from './workspace-navigation';
import { test,expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { configureMethod,type MethodFixture } from './method-form';
const fixtures=JSON.parse(readFileSync(new URL('../../../packages/data-core/fixtures/processing-acceptance.json',import.meta.url),'utf8')) as MethodFixture[];
async function register(page:Page){
  const email=`processing-${crypto.randomUUID()}@example.com`,password='processing-password-123';
  await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
}
async function project(page:Page,name:string,csv:string){
  await page.goto('/projects');await page.getByLabel('Tên project mới',{exact:true}).fill(name);await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByRole('region',{name:'Bảng dữ liệu',exact:true})).toBeVisible();
}
test('all 27 typed forms create online previews without changing the published table, then Apply a new version',async({page})=>{
  test.setTimeout(240_000);await register(page);
  for(const item of fixtures.filter(item=>item.method!=='edit_cell')){
    await project(page,`Online ${item.method}`,item.csv);await configureMethod(page,item);
    const table=page.getByRole('region',{name:'Bảng dữ liệu',exact:true});const original=(await table.textContent())!;
    const response=page.waitForResponse(response=>response.url().endsWith('/previews')&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();
    const preview=await (await response).json();expect(preview.canApply,item.method).toBe(true);
    await expect(page.getByTestId('processing-preview')).toBeVisible();await expect(table).toHaveText(original);
    await page.getByRole('button',{name:'Áp dụng thay đổi',exact:true}).click();
    await expect(page.getByText('Phiên bản 2 ·',{exact:false})).toBeVisible();
    await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('2 thao tác');
  }
});

test('cell statistics, multiple selected columns and dataset scope have the same published semantics online and offline', async ({ page }) => {
  await register(page);
  for (const local of [false, true]) {
    const csv = 'n,m\n,10\n2,20\n4,30\n';
    if (local) {
      await page.goto('/offline'); await page.getByLabel('Tên project', { exact: true }).fill('Local scope matrix');
      await page.getByLabel('File CSV', { exact: true }).setInputFiles({ name: 'scope.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
      await page.getByRole('button', { name: 'Lưu offline', exact: true }).click(); await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
    } else await project(page, 'Online scope matrix', csv);
    const apply = async () => {
      await page.getByRole('button', { name: 'Xem trước thay đổi', exact: true }).click();
      await expect(page.getByTestId('processing-preview')).toBeVisible();
      await page.getByRole('button', { name: local ? 'Áp dụng offline' : 'Áp dụng thay đổi', exact: true }).click();
    };
    await page.getByRole('button', { name: 'Dòng 1, cột n', exact: true }).click();
    await chooseMethod(page,'fill_mean');
    await page.getByLabel('Phạm vi', { exact: true }).selectOption('cell');
    await apply(); await expect(page.getByRole('button', { name: 'Dòng 1, cột n', exact: true })).toHaveText('3');
    await expect(page.getByRole('button', { name: 'Dòng 1, cột m', exact: true })).toHaveText('10');
    await chooseMethod(page,'scale_minmax');
    await page.getByLabel('Phạm vi', { exact: true }).selectOption('columns');
    await ensureProcessing(page);await page.getByLabel('Các cột xử lý', { exact: true }).selectOption([{ label: 'n' }, { label: 'm' }]);
    await apply(); await expect(page.getByRole('button', { name: 'Dòng 1, cột n', exact: true })).toHaveText('0.5');
    await expect(page.getByRole('button', { name: 'Dòng 2, cột m', exact: true })).toHaveText('0.5');
    await chooseMethod(page,'square');
    await page.getByLabel('Phạm vi', { exact: true }).selectOption('dataset');
    await apply(); await expect(page.getByRole('button', { name: 'Dòng 1, cột n', exact: true })).toHaveText('0.25');
    await expect(page.getByRole('button', { name: 'Dòng 2, cột m', exact: true })).toHaveText('0.25');
    if (local) {
      await page.getByRole('button', { name: 'Đồng bộ lên server', exact: true }).click();
      await expect(page.getByTestId('sync-state')).toContainText('synced · 3/3');
    } else {await openStep(page,'history');await expect(page.getByRole('region', { name: 'Lịch sử phiên bản', exact: true })).toContainText('4 thao tác');}
  }
});
test('online Apply retries its receipt after response loss, no-op is disabled, and restore creates a fresh version',async({page})=>{
  await register(page);await project(page,'Receipt and restore','n,t\n-2,a\n2,b\n');
  await configureMethod(page,{method:'uppercase',csv:'',column:1,parameters:{}});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.screenshot({path:test.info().outputPath('processing-preview-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:test.info().outputPath('processing-preview-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1280,height:720});
  let interrupted=false;
  await page.route('**/api/v1/datasets/*/operations',async route=>{
    if(route.request().method()==='POST'&&!interrupted){interrupted=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();
  });
  await page.getByRole('button',{name:'Áp dụng thay đổi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Kiểm tra lại Apply',exact:true})).toBeEnabled();
  await expect(page.locator('.section-tabs button[data-step="missing"]')).toBeDisabled();
  await page.getByRole('button',{name:'Kiểm tra lại Apply',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 1, cột t',exact:true})).toHaveText('A');
  await expect(page.locator('.section-tabs button[data-step="missing"]')).toBeEnabled();
  await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('2 thao tác');
  await configureMethod(page,{method:'uppercase',csv:'',column:1,parameters:{}});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toContainText('NO_CHANGES_DETECTED');
  await expect(page.getByRole('button',{name:'Áp dụng thay đổi',exact:true})).toBeDisabled();
  await openStep(page,'history');await page.getByRole('button',{name:'Khôi phục phiên bản',exact:true}).click();
  await page.getByRole('button',{name:'Xác nhận khôi phục',exact:true}).click();
  await expect(page.getByText('Phiên bản 3 ·',{exact:false})).toBeVisible();await openStep(page,'collection');await expect(page.getByRole('button',{name:'Dòng 1, cột t',exact:true})).toHaveText('a');
  await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('3 thao tác');
  await configureMethod(page,{method:'log1p',csv:'',parameters:{}});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toContainText('invalid');await expect(page.getByRole('button',{name:'Áp dụng thay đổi',exact:true})).toBeDisabled();
});


test('preview diff failure blocks Apply, and expiry is enforced by the frontend',async({page})=>{
  await page.clock.install();await register(page);await project(page,'Preview expiry','n,t\n1,a\n2,b\n');
  await configureMethod(page,{method:'uppercase',csv:'',column:1,parameters:{}});
  await page.route('**/api/v1/datasets/*/previews/*?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'UNAVAILABLE',message:'Preview diff temporarily unavailable'}})}));
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Preview diff temporarily unavailable');
  await expect(page.getByRole('button',{name:'Áp dụng thay đổi',exact:true})).toBeDisabled();
  await page.unroute('**/api/v1/datasets/*/previews/*?*');
  await page.getByRole('button',{name:'Tải lại preview',exact:true}).click();await expect(page.getByRole('button',{name:'Áp dụng thay đổi',exact:true})).toBeEnabled();
  await page.clock.fastForward(31*60_000);
  await expect(page.getByTestId('processing-preview')).toContainText('Preview đã hết hạn');await expect(page.getByRole('button',{name:'Áp dụng thay đổi',exact:true})).toBeDisabled();
  await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('1 thao tác');
});

test('local preview is unpublished and a stale Apply from a second tab cannot overwrite newer local history',async({page,context})=>{
  await page.goto('/offline');await page.getByLabel('Tên project',{exact:true}).fill('Local CAS preview');
  await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'local.csv',mimeType:'text/csv',buffer:Buffer.from('n,t\n1,  a  \n2,b\n')});await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
  await configureMethod(page,{method:'normalize_whitespace',csv:'',column:1,parameters:{mode:'trim'}});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();await expect(page.getByTestId('sync-state')).toContainText('0/0');
  const other=await context.newPage();
  try{
    await other.goto('/offline');await configureMethod(other,{method:'uppercase',csv:'',column:1,parameters:{}});
    await other.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(other.getByTestId('processing-preview')).toBeVisible();await other.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(other.getByTestId('sync-state')).toContainText('0/1');
    await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Bản local đã đổi ở tab khác');
    await page.getByRole('button',{name:'Tải lại dữ liệu local',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('0/1');await expect(page.getByRole('button',{name:'Dòng 1, cột t',exact:true})).toHaveText('A');
  }finally{await other.close();}
});
