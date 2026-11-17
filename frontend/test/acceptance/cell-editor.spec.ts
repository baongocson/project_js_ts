import { openStep } from './workspace-navigation';
import { test,expect,type Page } from '@playwright/test';
const password='editor-password-123';
test('a real WebGL point click opens its editable row table',async({page})=>{
  await page.goto('/offline');await page.getByLabel('Tên project',{exact:true}).fill('WebGL direct edit');await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'points.csv',mimeType:'text/csv',buffer:Buffer.from('x,y,z\n1,1,1\n2,2,2\n3,3,3\n')});await page.getByRole('button',{name:'Lưu offline',exact:true}).click();
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await expect(page.getByTestId('webgl-scene')).toHaveAttribute('data-ready','true');
  const canvas=page.getByLabel('Không gian WebGL 3D',{exact:true});await canvas.click();await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 2');await page.getByLabel('Sửa ô x',{exact:true}).fill('8');await page.getByRole('button',{name:'Lưu ô x',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 2, cột x',exact:true})).toHaveText('8');
});
async function login(page:Page){const email=`cell-editor-${crypto.randomUUID()}@example.com`;await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);}
async function importData(page:Page,local:boolean){
  if(local){await page.goto('/offline');await page.getByLabel('Tên project',{exact:true}).fill('Typed local cell');}
  else{await page.getByLabel('Tên project mới',{exact:true}).fill('Typed online cell');await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name:'Typed online cell',exact:true})).toBeVisible();}
  await page.getByLabel(local?'File CSV':'File CSV online',{exact:true}).setInputFiles({name:'mixed.csv',mimeType:'text/csv',buffer:Buffer.from('n,t,x,y,z\n001,a,1,2,3\n2,b,4,5,6\n')});await page.getByLabel('Kiểu cột n',{exact:true}).selectOption('mixed');await page.getByRole('button',{name:local?'Lưu offline':'Import lên server',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 2, cột n',exact:true})).toHaveText('2');
}

async function pick(page:Page,index:number){
  if(!await page.getByLabel('Màu điểm',{exact:true}).isVisible())await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();
  const fallback=page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true});if(!await page.locator('svg.scatter-svg').isVisible()){await expect(fallback).toBeVisible();await fallback.click();}
  await page.locator('circle[data-point]').nth(index).focus();await page.keyboard.press('Enter');
  await expect(page.getByTestId('analysis-selected-row')).toContainText('Chỉnh sửa trực tiếp');
}
async function edit(page:Page){
  await pick(page,1);await expect(page.getByLabel('Sửa ô n',{exact:true})).toHaveValue('2');
  await page.getByLabel('Sửa ô n',{exact:true}).fill('5');await page.getByRole('button',{name:'Lưu ô n',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 2, cột n',exact:true})).toHaveText('5');
  await pick(page,0);await expect(page.getByLabel('Sửa ô n',{exact:true})).toHaveValue('001');
  await page.getByLabel('Kiểu ô n',{exact:true}).selectOption('boolean');await page.getByRole('button',{name:'Lưu ô n',exact:true}).click();
  await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('false');
}
test('click a 3D point and edit typed cells directly online and offline; edit_cell is absent from processing',async({page})=>{
  await login(page);await importData(page,false);await edit(page);await page.reload();await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('false');await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('3 thao tác');
  await openStep(page,'cleaning');expect(await page.getByLabel('Phương pháp',{exact:true}).locator('option').evaluateAll(elements=>elements.map(element=>(element as HTMLOptionElement).value))).not.toContain('edit_cell');
  await importData(page,true);await edit(page);await expect(page.getByTestId('sync-state')).toContainText('0/2');await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');
});
test('direct cell save reconciles a lost Apply response with the same key and prevents changing rows while dirty',async({page})=>{
  await login(page);await importData(page,false);await pick(page,1);
  await page.getByLabel('Sửa ô n',{exact:true}).fill('9');
  await page.locator('circle[data-point]').first().focus();await page.keyboard.press('Enter');await expect(page.getByRole('alert')).toContainText('Hãy lưu hoặc bỏ');
  await expect(page.getByLabel('Sửa ô n',{exact:true})).toHaveValue('9');
  const keys:string[]=[];let first=true;
  await page.route('**/api/v1/datasets/*/operations',async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().headers()['idempotency-key']);if(first){first=false;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Lưu ô n',exact:true}).click();await expect(page.getByRole('button',{name:'Kiểm tra lại lưu ô n',exact:true})).toBeEnabled();
  await expect(page.locator('.section-tabs button[data-step="missing"]')).toBeDisabled();
  await page.getByRole('button',{name:'Kiểm tra lại lưu ô n',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 2, cột n',exact:true})).toHaveText('9');expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  await page.screenshot({path:test.info().outputPath('point-row-editor-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:test.info().outputPath('point-row-editor-mobile.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await openStep(page,'history');await expect(page.getByRole('region',{name:'Lịch sử phiên bản',exact:true})).toContainText('2 thao tác');
});
