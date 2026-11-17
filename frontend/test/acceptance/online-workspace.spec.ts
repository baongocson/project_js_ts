import { test,expect } from '@playwright/test';

test('auth/profile, server projects, CSV typed table and serialized workspace autosave persist after reload',async({page})=>{
  const email=`workspace-${crypto.randomUUID()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill('workspace-password-123');
  await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('workspace-password-123');
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill('workspace-password-123');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel('Tên project mới',{exact:true}).fill('Phân tích doanh thu');
  await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name:'Phân tích doanh thu',exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'sales.csv',mimeType:'text/csv',buffer:Buffer.from('score,label\n1,a\n2,b\n3,c\n')});
  await page.getByRole('button',{name:'Import lên server',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 2, cột score',exact:true})).toHaveText('2');
  await page.getByLabel('Cột filter',{exact:true}).selectOption({label:'score'});
  await page.getByLabel('Điều kiện filter',{exact:true}).selectOption('gt');
  await page.getByLabel('Giá trị filter',{exact:true}).fill('1');await page.getByRole('button',{name:'Lọc',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 1, cột score',exact:true})).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');
  await page.reload();await expect(page.getByRole('button',{name:'Dòng 1, cột score',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Dòng 3, cột score',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Bỏ lọc',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 1, cột score',exact:true})).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');
  await page.goto('/profile');await page.getByLabel('Tên hiển thị',{exact:true}).fill('Nhóm phân tích');
  await page.getByLabel('Giao diện',{exact:true}).selectOption('dark');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Đã cập nhật hồ sơ trên server.');await page.reload();
  await expect(page.getByLabel('Tên hiển thị',{exact:true})).toHaveValue('Nhóm phân tích');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.goto('/projects');await page.getByRole('button',{name:'Đổi tên',exact:true}).click();
  await page.getByLabel('Tên project',{exact:true}).fill('Đã đổi tên');await page.getByRole('button',{name:'Lưu tên',exact:true}).click();await expect(page.getByRole('heading',{name:'Đã đổi tên',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Xóa',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa project',exact:true}).click();await expect(page.getByRole('heading',{name:'Chưa có project',exact:true})).toBeVisible();
});

test('two browser tabs cannot silently overwrite a stale workspace revision',async({page,context})=>{
  const email=`cas-${crypto.randomUUID()}@example.com`;
  await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill('workspace-password-123');await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('workspace-password-123');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill('workspace-password-123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel('Tên project mới',{exact:true}).fill('CAS project');await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name:'CAS project',exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'cas.csv',mimeType:'text/csv',buffer:Buffer.from('score,label\n1,a\n2,b\n3,c\n')});await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 3, cột score',exact:true})).toBeVisible();
  const other=await context.newPage();
  try{
    await other.goto(page.url());await expect(other.getByRole('button',{name:'Dòng 3, cột score',exact:true})).toBeVisible();
    await page.getByLabel('Điều kiện filter',{exact:true}).selectOption('gt');await page.getByLabel('Giá trị filter',{exact:true}).fill('1');await page.getByRole('button',{name:'Lọc',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu workspace');
    await other.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await expect(other.getByRole('status')).toContainText('Xung đột');await expect(other.getByRole('button',{name:'Tải lại workspace',exact:true})).toBeVisible();
    await other.getByRole('button',{name:'Tải lại workspace',exact:true}).click();await expect(other.getByRole('status')).toHaveText('Đã tải workspace');await expect(other.getByRole('button',{name:'Dòng 1, cột score',exact:true})).toHaveCount(0);await expect(other.getByRole('button',{name:'Dòng 3, cột score',exact:true})).toBeVisible();
  }finally{await other.close();}
});
