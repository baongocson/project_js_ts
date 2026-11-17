import { test,expect,type Page } from '@playwright/test';
async function project(page:Page){
  const email=`draft-${crypto.randomUUID()}@example.com`,password='draft-password-123';
  await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel('Tên project mới',{exact:true}).fill('Draft recovery');await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name:'Draft recovery',exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'draft.csv',mimeType:'text/csv',buffer:Buffer.from('x,t\n1,a\n2,b\n3,c\n')});await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 3, cột x',exact:true})).toBeVisible();
  return page.url();
}
test('leaving before debounce keeps an account-bound draft; recovery is explicit and persists after reload',async({page})=>{
  const url=await project(page);let patches=0;page.on('request',request=>{if(request.method()==='PATCH'&&request.url().endsWith('/workspace'))patches++;});
  await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await page.getByRole('link',{name:'Projects online',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);expect(patches).toBe(0);
  await page.goto(url);await expect(page.getByRole('heading',{name:'Có bản nháp chưa được xác nhận',exact:true})).toBeVisible();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('10');
  await page.getByRole('button',{name:'Khôi phục bản nháp',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');
  await page.reload();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');await expect(page.getByRole('heading',{name:'Có bản nháp chưa được xác nhận',exact:true})).toHaveCount(0);
});
test('unknown workspace commit is reconciled on reload without replay; failed save retains draft and allows recovery',async({page})=>{
  await project(page);let lost=false,patches=0;
  await page.route('**/api/v1/projects/*/workspace',async route=>{
    patches++;if(!lost){lost=true;expect((await route.fetch()).status()).toBe(200);await route.abort('failed');}else await route.continue();
  });
  await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await expect(page.getByRole('status')).toContainText('Chưa lưu');await page.reload();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');await expect(page.getByRole('heading',{name:'Có bản nháp chưa được xác nhận',exact:true})).toHaveCount(0);expect(patches).toBe(1);
  await page.unroute('**/api/v1/projects/*/workspace');await page.route('**/api/v1/projects/*/workspace',route=>route.abort('failed'));
  await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('50');await expect(page.getByRole('status')).toContainText('Chưa lưu');await page.reload();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');await expect(page.getByRole('button',{name:'Khôi phục bản nháp',exact:true})).toBeVisible();
  await page.unroute('**/api/v1/projects/*/workspace');await page.getByRole('button',{name:'Khôi phục bản nháp',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('50');
});
test('workspace CAS conflict preserves the losing draft for export or deliberate reconciliation',async({page,context})=>{
  const url=await project(page),other=await context.newPage();
  try{
    await other.goto(url);await expect(other.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('10');
    await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');
    await other.getByLabel('Số dòng/trang',{exact:true}).selectOption('50');await expect(other.getByRole('status')).toContainText('Xung đột');await other.getByRole('button',{name:'Tải lại workspace',exact:true}).click();
    await expect(other.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');await expect(other.getByRole('region',{name:'Phục hồi workspace',exact:true})).toContainText('Workspace server đã đổi');
    const download=other.waitForEvent('download');await other.getByRole('button',{name:'Xuất bản nháp',exact:true}).click();expect((await download).suggestedFilename()).toBe('workspace-draft.json');
    await other.getByRole('button',{name:'Khôi phục bản nháp',exact:true}).click();await expect(other.getByRole('status')).toHaveText('Đã lưu workspace');await expect(other.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('50');
  }finally{await other.close();}
});
