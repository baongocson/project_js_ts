import { test,expect,type Page } from '@playwright/test';
const source='\uFEFFn;t;b;d;note\n001; a ;true;2026-11-16;"hello\nworld"\n002;N/A;false;2026-11-17;""\n';
async function login(page:Page){
  const email=`import-${crypto.randomUUID()}@example.com`,password='import-password-123';
  await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
}
async function wizard(page:Page,local:boolean){
  await page.getByLabel('Dấu phân cách',{exact:true}).selectOption(';');
  await page.getByLabel(local?'File CSV':'File CSV online',{exact:true}).setInputFiles({name:'typed.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
  const preview=page.getByRole('region',{name:'Xem trước CSV',exact:true});await expect(preview).toContainText('001');await expect(preview).toContainText(/hello\s+world/);await expect(preview).toContainText('Chuỗi rỗng');
  await page.getByLabel('Kiểu cột b',{exact:true}).selectOption('number');await expect(page.getByRole('alert')).toContainText('CSV_TYPE_MISMATCH');await expect(page.getByRole('alert')).toContainText('Record 2, dòng 2–3, cột 2');await expect(page.getByRole('button',{name:local?'Lưu offline':'Import lên server',exact:true})).toBeDisabled();
  await page.getByLabel('Kiểu cột b',{exact:true}).selectOption('');await page.getByLabel('Kiểu cột n',{exact:true}).selectOption('number');await expect(preview).not.toContainText('001');await expect(preview.getByRole('columnheader',{name:/^n\s*number$/})).toBeVisible();
}
test('shared import wizard recomputes online overrides, reports CSV locations and imports quoted/BOM typed data',async({page})=>{
  await login(page);await page.getByLabel('Tên project mới',{exact:true}).fill('Online typed import');await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name:'Online typed import',exact:true})).toBeVisible();
  await wizard(page,false);await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');await expect(page.getByRole('button',{name:'Dòng 2, cột t',exact:true})).toHaveText('N/A');await expect(page.getByRole('button',{name:'Dòng 2, cột note',exact:true})).toHaveText('Chuỗi rỗng');await expect(page.getByRole('button',{name:'Dòng 1, cột b',exact:true})).toHaveText('true');await page.reload();await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');
});
test('offline import persists exact source/options and sync reuses delimiter/type overrides',async({page,context})=>{
  await login(page);await page.goto('/offline');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);
  await page.getByLabel('Tên project',{exact:true}).fill('Offline typed import');await wizard(page,true);await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');await expect(page.getByRole('region',{name:'Xem trước CSV',exact:true})).toHaveCount(0);
  const saved=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('dashboard3d-projects-v1');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    try{return await new Promise<{source:number[];importOptions:unknown;rawToken?:string}>((resolve,reject)=>{const request=db.transaction('projects').objectStore('projects').getAll();request.onsuccess=()=>{const project=request.result[0];resolve({source:Array.from(project.source as Uint8Array),importOptions:project.importOptions,rawToken:project.original.rows[0].cells[project.original.columns[0].columnId].rawToken});};request.onerror=()=>reject(request.error);});}finally{db.close();}
  });
  expect(saved.source).toEqual(Array.from(Buffer.from(source)));expect(saved.importOptions).toEqual({delimiter:';',columnTypes:[{position:0,logicalType:'number'}]});expect(saved.rawToken).toBe('001');
  await page.reload();await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');await context.setOffline(false);await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 0/0');
});
test('shared CSV validation rejects blank records and oversize inputs, and header-only remains importable offline',async({page})=>{
  await page.goto('/offline');await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'blank.csv',mimeType:'text/csv',buffer:Buffer.from('x,y\n1,a\n\n')});await expect(page.getByRole('alert')).toContainText('CSV_BLANK_RECORD');await expect(page.getByRole('button',{name:'Lưu offline',exact:true})).toBeDisabled();
  await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'large.csv',mimeType:'text/csv',buffer:Buffer.alloc(16_000_001,32)});await expect(page.getByRole('alert')).toContainText('16.000.000');await expect(page.getByRole('button',{name:'Lưu offline',exact:true})).toBeDisabled();
  await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'empty.csv',mimeType:'text/csv',buffer:Buffer.from('x,y\n')});await expect(page.getByRole('region',{name:'Xem trước CSV',exact:true})).toContainText('chỉ có header');await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');await expect(page.getByRole('region',{name:'Bảng dữ liệu',exact:true})).toContainText('Không có dòng phù hợp');
});
