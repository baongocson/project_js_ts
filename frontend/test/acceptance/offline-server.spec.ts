import { chooseMethod, ensureProcessing, openStep } from './workspace-navigation';
import { test,expect,type Page,type BrowserContext } from '@playwright/test';
import { configureMethod } from './method-form';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const password='acceptance-password-123';
const methods=JSON.parse(readFileSync(fileURLToPath(new URL('../../../packages/data-core/fixtures/processing-acceptance.json',import.meta.url)),'utf8')) as {method:string;csv:string;parameters:Record<string,unknown>;column?:number}[];
async function login(page:Page,email:string,register=false){
  await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);
  if(register){await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đăng ký');}
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
}
async function localProject(page:Page,context:BrowserContext){
  await page.goto('/offline');await page.waitForFunction(async()=>(await navigator.serviceWorker.getRegistrations()).some(registration=>registration.active!==null),{},{timeout:20_000});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);
  await page.getByLabel('Tên project',{exact:true}).fill('Offline acceptance');
  await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'offline.csv',mimeType:'text/csv',buffer:Buffer.from('n,t\n1,  a  \n2,b\n3,a\n')});
  await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
  await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:'t'});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu thay đổi offline');
  await chooseMethod(page,'one_hot');
  await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:'t'});
  await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('0/2');
  await page.reload();await expect(page.getByTestId('sync-state')).toContainText('0/2');
  await context.setOffline(false);
}
async function authenticatedRequest(page:Page,email:string,path:string,method='GET',body?:unknown){
  return page.evaluate(async input=>{
    const session=await (await fetch('/api/v1/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:input.email,password:input.password})})).json() as {accessToken:string};
    const response=await fetch('/api/v1/'+input.path,{method:input.method,headers:{Authorization:`Bearer ${session.accessToken}`,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},...(input.body===undefined?{}:{body:JSON.stringify(input.body)})});
    return {status:response.status,body:await response.json().catch(()=>({})) as Record<string,unknown>};
  },{email,password,path,method,body});
}
test('offline/reload, multi-step ID mapping, lost Apply receipt, new browser session and HTTPS cookie lifecycle',async({page,context,browser})=>{
  const email=`offline-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  expect((await context.cookies()).find(cookie=>cookie.name==='refresh_token')).toMatchObject({httpOnly:true,secure:true,sameSite:'Lax',path:'/api/v1/auth'});
  let interrupted=false;
  await page.route('**/api/v1/datasets/*/operations',async route=>{
    if(route.request().method()==='POST'&&!interrupted){interrupted=true;const response=await route.fetch();expect(response.status()).toBe(201);await route.abort('failed');}else await route.continue();
  });
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('retry');
  await page.reload();await expect(page.getByTestId('sync-state')).toContainText('retry');
  await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');
  await context.setOffline(true);
  await openStep(page,'history');await page.getByRole('button',{name:'Khôi phục offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu restore offline');
  await page.reload();await expect(page.getByTestId('sync-state')).toContainText('2/3');await context.setOffline(false);
  await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
  let restoreLost=false;
  await page.route('**/api/v1/datasets/*/versions/*/restore',async route=>{
    if(!restoreLost){restoreLost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();
  });
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByRole('status')).toContainText('Chưa đồng bộ:');
  await page.reload();await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 3/3');
  const dataset=await page.getByTestId('server-dataset').innerText();
  const fresh=await browser.newContext({ignoreHTTPSErrors:true}),other=await fresh.newPage();
  try{
    await other.goto('/offline');
    const history=await authenticatedRequest(other,email,`datasets/${dataset}/operations`);
    expect(history.status).toBe(200);expect(history.body.total).toBe(4);
    const items=history.body.items as {resultVersionId:string}[];
    const rows=await authenticatedRequest(other,email,`datasets/${dataset}/versions/${items[0].resultVersionId}/rows`);
    expect(rows.status).toBe(200);expect((rows.body.rows as unknown[]).length).toBe(3);
  }finally{await fresh.close();}
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đăng xuất');
  await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).not.toHaveText('Đã đăng nhập');
});
test('lost create/import responses reuse persisted keys without duplicate projects or imports',async({page,context})=>{
  const email=`receipts-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  let createLost=false,importLost=false;
  await page.route('**/api/v1/projects',async route=>{
    if(route.request().method()==='POST'&&!createLost){createLost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();
  });
  await page.route('**/api/v1/projects/*/datasets',async route=>{
    if(route.request().method()==='POST'&&!importLost){importLost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();
  });
  for(let attempt=0;attempt<3;attempt++){
    await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();
    if(attempt<2){await expect(page.getByRole('status')).toContainText('Chưa đồng bộ:');await expect(page.getByTestId('sync-state')).toContainText('retry');await page.reload();await page.getByRole('button',{name:'Khôi phục phiên',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã đăng nhập');}
    else await expect(page.getByTestId('sync-state')).toContainText('synced');
  }
  const list=await authenticatedRequest(page,email,'projects');expect(list.body.total).toBe(1);
  const dataset=await page.getByTestId('server-dataset').innerText();
  const history=await authenticatedRequest(page,email,`datasets/${dataset}/operations`);expect(history.body.total).toBe(3);
});
test('account mismatch and deleted project stop sync and preserve local data',async({page,context})=>{
  const email=`owner-${crypto.randomUUID()}@example.com`,other=`other-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced');
  const project=await page.getByTestId('server-project').innerText();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đăng xuất');await login(page,other,true);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByRole('alert')).toContainText('SYNC_ACCOUNT_MISMATCH');
  await expect(page.getByRole('table')).toBeVisible();
  await login(page,email);expect((await authenticatedRequest(page,email,`projects/${project}`,'DELETE')).status).toBe(204);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('blocked');
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button',{name:'Xóa tài khoản server',exact:true}).click();await page.getByLabel('Tôi hiểu bản local và bản nháp giữ lại không thể đồng bộ về tài khoản đã xóa',{exact:true}).check();await page.getByLabel('Nhập XÓA để xác nhận',{exact:true}).fill('XÓA');await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã xóa tài khoản server');
  await expect(page.getByRole('button',{name:'Đồng bộ lên server',exact:true})).toBeDisabled();await expect(page.getByRole('table')).toBeVisible();
});
test('server head changes become conflict without overwriting the local copy',async({page,context})=>{
  const email=`conflict-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced');
  const project=await page.getByTestId('server-project').innerText(),dataset=await page.getByTestId('server-dataset').innerText();
  const state=await authenticatedRequest(page,email,`projects/${project}`);
  const version=(state.body.dataset as {currentVersionId:string}).currentVersionId;
  const preview=await authenticatedRequest(page,email,`datasets/${dataset}/previews`,'POST',{baseVersionId:version,specification:{method:'square',parameters:{},scope:{type:'dataset'}}});
  // one-hot columns are 0/1; transform numeric source explicitly to ensure a changed candidate.
  if(preview.body.canApply===true)expect((await authenticatedRequest(page,email,`datasets/${dataset}/operations`,'POST',{previewId:preview.body.previewId})).status).toBe(201);
  else throw new Error('Expected square to change numeric source');
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByRole('alert')).toContainText('BASE_VERSION_STALE');
  await expect(page.getByRole('table')).toBeVisible();
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Tải bản server để đối chiếu',exact:true}).click();const downloaded=JSON.parse(await readFile((await (await downloading).path())!,'utf8'));
  expect(downloaded.format).toBe('data-workspace-server-snapshot');expect(downloaded.versionId).not.toBe(version);expect(downloaded.snapshot.rows).toHaveLength(3);await expect(page.getByRole('button',{name:'Dòng 2, cột n',exact:true})).toHaveText('2');await expect(page.getByTestId('sync-state')).toContainText('conflict');
  await page.getByLabel('Tự đồng bộ khi kết nối lại',{exact:true}).check();await page.getByRole('button',{name:'Giữ local và dừng tự đồng bộ',exact:true}).click();await expect(page.getByLabel('Tự đồng bộ khi kết nối lại',{exact:true})).not.toBeChecked();

});
test('all 27 processing panel methods use the shared fixture in browser offline and match published server snapshots',async({page,context})=>{
  test.setTimeout(180_000);
  const email=`methods-${crypto.randomUUID()}@example.com`;
  await page.goto('/offline');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await login(page,email,true);
  expect(methods).toHaveLength(28);
  for(const item of methods.filter(item=>item.method!=='edit_cell')){
    await context.setOffline(true);
    await page.getByLabel('Tên project',{exact:true}).fill(`Parity ${item.method}`);
    await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from(item.csv)});
    await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
    await configureMethod(page,item);
    await page.getByRole('button',{name:'Xem trước thay đổi',exact:true}).click();await expect(page.getByTestId('processing-preview')).toBeVisible();
  await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu thay đổi offline');
    await context.setOffline(false);
    await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();
    await expect(page.getByTestId('sync-state'),item.method).toContainText('synced · 1/1');
  }
});


test('different server preview content stops before Apply and preserves the local candidate',async({page,context})=>{
  const email=`preview-guard-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  let applies=0;
  await page.route('**/api/v1/datasets/*/operations',async route=>{if(route.request().method()==='POST')applies++;await route.continue();});
  await page.route('**/api/v1/datasets/*/previews/*?*',async route=>{
    const response=await route.fetch();const body=await response.json();
    const first=body.changes[0];
    const column=Object.keys(first.afterCells)[0];
    first.afterCells[column]={kind:'number',value:999};
    await route.fulfill({response,json:body});
  });
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();
  await expect(page.getByTestId('sync-state')).toContainText('conflict · 0/2');
  expect(applies).toBe(0);
  const dataset=await page.getByTestId('server-dataset').innerText();
  const history=await authenticatedRequest(page,email,`datasets/${dataset}/operations`);
  expect(history.body.total).toBe(1); // Only original import was published.
  await expect(page.getByRole('region',{name:'Bảng dữ liệu',exact:true})).toContainText('n');
  await page.unroute('**/api/v1/datasets/*/previews/*?*');
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();
  await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');
});


test('a terminal expired preview before any Apply can be recreated on the unchanged head',async({page,context})=>{
  const email=`preview-expiry-${crypto.randomUUID()}@example.com`;
  await localProject(page,context);await login(page,email,true);
  const previewKeys:string[]=[];let applies=0,expired=false;
  await page.route('**/api/v1/datasets/*/previews',async route=>{previewKeys.push(route.request().headers()['idempotency-key']);await route.continue();});
  await page.route('**/api/v1/datasets/*/operations',async route=>{if(route.request().method()==='POST')applies++;await route.continue();});
  await page.route('**/api/v1/datasets/*/previews/*?*',async route=>{
    if(!expired){expired=true;await route.fulfill({status:410,contentType:'application/json',body:JSON.stringify({error:{code:'PREVIEW_EXPIRED',message:'Preview expired before Apply'}})});}else await route.continue();
  });
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('retry · 0/2');expect(applies).toBe(0);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('synced · 2/2');
  expect(previewKeys[1]).not.toBe(previewKeys[0]);expect(applies).toBe(2);
  const dataset=await page.getByTestId('server-dataset').innerText();expect((await authenticatedRequest(page,email,`datasets/${dataset}/operations`)).body.total).toBe(3);
});
