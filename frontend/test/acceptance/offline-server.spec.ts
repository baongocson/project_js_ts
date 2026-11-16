import { test,expect,type Page,type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
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
  await page.getByRole('combobox',{name:'Cột',exact:true}).selectOption({label:'t'});
  await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu thay đổi offline');
  await page.getByRole('combobox',{name:'Phương pháp',exact:true}).selectOption('one_hot');
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
  await page.getByRole('button',{name:'Khôi phục offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu restore offline');
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
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đăng xuất');
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
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await login(page,other,true);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByRole('alert')).toContainText('SYNC_ACCOUNT_MISMATCH');
  await expect(page.getByRole('table')).toBeVisible();
  await login(page,email);expect((await authenticatedRequest(page,email,`projects/${project}`,'DELETE')).status).toBe(204);
  await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();await expect(page.getByTestId('sync-state')).toContainText('blocked');
  await expect(page.getByRole('table')).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Xóa tài khoản server',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã xóa tài khoản server');
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
});
test('all 27 methods use the shared fixture in browser offline and match published server snapshots',async({page,context})=>{
  test.setTimeout(180_000);
  const email=`methods-${crypto.randomUUID()}@example.com`;
  await page.goto('/offline');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await login(page,email,true);
  expect(methods).toHaveLength(27);
  for(const item of methods){
    await context.setOffline(true);
    await page.getByLabel('Tên project',{exact:true}).fill(`Parity ${item.method}`);
    await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'fixture.csv',mimeType:'text/csv',buffer:Buffer.from(item.csv)});
    await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu CSV offline');
    await page.getByRole('combobox',{name:'Phương pháp',exact:true}).selectOption(item.method);
    await page.getByRole('combobox',{name:'Cột',exact:true}).selectOption({label:item.column===1?'t':'n'});
    await page.getByRole('textbox',{name:'Tham số xử lý (JSON)',exact:true}).fill(JSON.stringify(item.parameters));
    await page.getByRole('button',{name:'Áp dụng offline',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Đã lưu thay đổi offline');
    await context.setOffline(false);
    await page.getByRole('button',{name:'Đồng bộ lên server',exact:true}).click();
    await expect(page.getByTestId('sync-state'),item.method).toContainText('synced · 1/1');
  }
});
