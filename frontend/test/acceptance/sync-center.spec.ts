import { chooseMethod, ensureProcessing } from './workspace-navigation';
import { test,expect,type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function setup(page:Page){
  await page.goto('/offline');await page.getByLabel('Tên project',{exact:true}).fill('Reconnect workspace');await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'source.csv',mimeType:'text/csv',buffer:Buffer.from('n,t\n1,  a  \n2,b\n')});await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
  await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:'t'});await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('0/1');
  const email=`sync-center-${crypto.randomUUID()}@example.com`;await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill('sync-center-password-123');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đăng ký');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');return email;
}
test('sync center reports durable phase/progress before Apply returns and only confirms after receipt',async({page})=>{
  await setup(page);let release:()=>void=()=>{};const hold=new Promise<void>(resolve=>{release=resolve;});let entered:()=>void=()=>{};const sent=new Promise<void>(resolve=>{entered=resolve;});
  await page.route('**/api/v1/datasets/*/operations',async route=>{entered();await hold;await route.continue();});
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await sent;
  await expect(page.getByTestId('sync-state')).toContainText('syncing · 0/1');await expect(page.getByRole('progressbar',{name:'Tiến độ thao tác đồng bộ'})).toHaveAttribute('value','0');
  await page.getByText('Hàng đợi và checkpoint · 0/1',{exact:true}).click();await expect(page.getByRole('region',{name:'Trung tâm đồng bộ',exact:true})).toContainText('Đã gửi Apply · đang xác nhận');release();
  await expect(page.getByTestId('sync-state')).toContainText('synced · 1/1');await expect(page.getByRole('progressbar',{name:'Tiến độ thao tác đồng bộ'})).toHaveAttribute('value','1');
});
test('reconnect coordinator in two tabs resumes an uncertain Apply with the original key and a single published result',async({page,context})=>{
  await setup(page);let lost=false;const keys:string[]=[];
  await context.route('**/api/v1/datasets/*/operations',async route=>{if(route.request().method()==='POST'){keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');return;}}await route.continue();});
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('retry');await context.setOffline(true);await page.getByLabel('Tự đồng bộ khi kết nối lại',{exact:true}).check();await expect(page.getByRole('status')).toContainText('Đã bật đồng bộ tự động');
  // A second cached tab shares the same Web Lock and project progress channel.
  const other=await context.newPage();
  try{await other.goto('/offline');await expect(other.getByTestId('sync-state')).toContainText('retry');await context.setOffline(false);await expect(page.getByTestId('sync-state')).toContainText('synced · 1/1');await expect(other.getByTestId('sync-state')).toContainText('synced · 1/1');expect(keys).toHaveLength(2);expect(keys[1]).toBe(keys[0]);}finally{await other.close();}
});
test('automatic replay probes API availability, waits with backoff and resumes only after the API is healthy',async({page,context})=>{
  await setup(page);await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced');await context.setOffline(true);
  await chooseMethod(page,'uppercase');await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:'t'});await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('1/2');
  await page.clock.install();let mutations=0;page.on('request',request=>{if(request.method()==='POST'&&/\/datasets\//.test(request.url()))mutations++;});
  await page.route('**/api/v1/health',route=>route.fulfill({status:503,headers:{'Retry-After':'10'},contentType:'application/json',body:JSON.stringify({error:{code:'UNAVAILABLE',message:'Test API unavailable'}})}));
  await page.getByLabel('Tự đồng bộ khi kết nối lại',{exact:true}).check();await context.setOffline(false);await page.clock.fastForward(300);await expect(page.getByText('Đã tự thử 1/5 lần.',{exact:false})).toBeVisible();expect(mutations).toBe(0);
  await page.unroute('**/api/v1/health');await page.clock.fastForward(2500);expect(mutations).toBe(0);await page.clock.fastForward(8000);await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');expect(mutations).toBe(2);
});


test('automatic retries stop at the persisted five-attempt limit and a manual retry can resume',async({page,context})=>{
  await setup(page);await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced');await context.setOffline(true);
  await chooseMethod(page,'uppercase');await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:'t'});await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('1/2');
  await page.clock.install();let probes=0;
  await page.route('**/api/v1/health',route=>{probes++;return route.fulfill({status:503,contentType:'application/json',body:'{}'});});await page.getByLabel('Tự đồng bộ khi kết nối lại',{exact:true}).check();await context.setOffline(false);
  for(let attempt=1;attempt<=5;attempt++){await page.clock.fastForward(attempt===1?300:2000*2**(attempt-2)+300);await expect(page.getByText(`Đã tự thử ${attempt}/5 lần.`,{exact:false})).toBeVisible();}
  expect(probes).toBe(5);await page.clock.fastForward(120_000);expect(probes).toBe(5);await expect(page.getByText('Đã dừng tự retry;',{exact:false})).toBeVisible();await page.unroute('**/api/v1/health');await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');
});

test('restoring an uncertain Apply backup replays a committed receipt without duplicating its version',async({page,browser})=>{
  const email=await setup(page);let lost=false;
  await page.route('**/api/v1/datasets/*/operations',async route=>{if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();});await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('retry');
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất backup project',exact:true}).click();const buffer=await readFile((await (await downloading).path())!);
  const context=await browser.newContext({ignoreHTTPSErrors:true}),other=await context.newPage();
  try{await other.goto('/offline');await other.getByLabel('File backup project',{exact:true}).setInputFiles({name:'receipt-backup.json',mimeType:'application/json',buffer});await other.getByRole('button',{name:'Phục hồi backup trên thiết bị',exact:true}).click();await expect(other.getByRole('status')).toContainText('Đã phục hồi backup');await other.getByLabel('Email',{exact:true}).fill(email);await other.getByLabel('Mật khẩu',{exact:true}).fill('sync-center-password-123');await other.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(other.getByRole('status')).toHaveText('Đã đăng nhập');
    let previews=0;other.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/previews'))previews++;});await other.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(other.getByTestId('sync-state')).toContainText('synced · 1/1');expect(previews).toBe(0);
  }finally{await context.close();}
});
