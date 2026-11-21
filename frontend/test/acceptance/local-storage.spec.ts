import { test,expect,type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { ENGINE_VERSION,importCsv,processSnapshot } from '@dashboard/data-core';
declare global {interface Window {legacyDatabaseForTest?:IDBDatabase}}
const source='n,t\n'+Array.from({length:30},(_,i)=>`${i+1},${i===0?' a ':'b'}`).join('\n')+'\n';
function legacyProject(){
  const original=importCsv(Buffer.from(source),{delimiter:','},()=>crypto.randomUUID());
  const specification={method:'uppercase' as const,parameters:{},scope:{type:'columns' as const,columnIds:[original.columns[1].columnId]},statisticsScope:{type:'whole-columns' as const}};
  const snapshot=processSnapshot(original,specification).snapshot;
  return {id:crypto.randomUUID(),name:'Legacy source retained',fileName:'legacy.csv',source:Array.from(Buffer.from(source)),sourceHash:createHash('sha256').update(source).digest('hex'),original,snapshot,engineVersion:ENGINE_VERSION,operations:[{id:crypto.randomUUID(),kind:'process',specification,snapshot,previewKey:crypto.randomUUID(),applyKey:crypto.randomUUID(),phase:'queued'}],createKey:crypto.randomUUID(),importKey:crypto.randomUUID(),cursor:0,status:'local'};
}
async function seed(page:Page){
  // The dashboard now reads IndexedDB. Seed v1 from a route that does not open
  // the local database so the fixture owns the first upgrade request.
  await page.goto('/login');const project=legacyProject();
  await page.evaluate(async project=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('dashboard3d-projects-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({...project,source:new Uint8Array(project.source)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
  },project);
  await page.goto('/offline');await expect(page.getByRole('heading',{name:project.name,exact:true})).toBeVisible();await expect(page.getByText('Đã tải workspace local',{exact:true})).toBeVisible();return project;
}
test('IndexedDB v1→v2 preserves original/source/history/keys and local table/selection/chart settings persist offline',async({page,context})=>{
  const project=await seed(page);
  const stored=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const req=indexedDB.open('dashboard3d-projects-v1');req.onsuccess=()=>resolve(req.result);});try{return await new Promise<{version:number;stores:string[];project:unknown}>(resolve=>{const req=db.transaction('projects').objectStore('projects').getAll();req.onsuccess=()=>resolve({version:db.version,stores:Array.from(db.objectStoreNames),project:{...req.result[0],source:Array.from(req.result[0].source as Uint8Array)}});});}finally{db.close();}});
  expect(stored.version).toBe(2);expect(stored.stores).toEqual(['projects','workspaces']);expect(stored.project).toEqual(project);
  await page.getByLabel('Cột filter',{exact:true}).selectOption({label:'n'});await page.getByLabel('Điều kiện filter',{exact:true}).selectOption('gt');await page.getByLabel('Giá trị filter',{exact:true}).fill('20');await page.getByRole('button',{name:'Lọc',exact:true}).click();await expect(page.getByText('Đã lưu workspace local',{exact:true})).toBeVisible();
  await page.getByLabel('Điều kiện filter',{exact:true}).selectOption('lt');await page.getByLabel('Giá trị filter',{exact:true}).fill('25');await page.getByRole('button',{name:'Thêm điều kiện',exact:true}).click();await expect(page.getByText('4/30 dòng',{exact:false})).toBeVisible();
  const n=project.original.columns[0].columnId;await page.getByLabel('Sắp xếp',{exact:true}).selectOption(`${n}:desc`);await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await page.getByRole('button',{name:'Dòng 24, cột n',exact:true}).click();
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await page.getByLabel('Màu điểm',{exact:true}).selectOption('missing');await expect(page.getByText('Đã lưu workspace local',{exact:true})).toBeVisible();
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);await page.reload();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');await expect(page.getByRole('button',{name:'Dòng 24, cột n',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByText('4/30 dòng',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await expect(page.getByLabel('Màu điểm',{exact:true})).toHaveValue('missing');
  await page.getByRole('button',{name:'Xóa điều kiện 2',exact:true}).click();await expect(page.getByText('10/30 dòng',{exact:false})).toBeVisible();
});
test('local workspace revisions reject a stale tab and reload uses the saved settings',async({page,context})=>{
  await seed(page);const other=await context.newPage();
  try{await other.goto('/offline');await expect(other.getByText('Đã tải workspace local',{exact:true})).toBeVisible();await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await expect(page.getByText('Đã lưu workspace local',{exact:true})).toBeVisible();await other.getByLabel('Số dòng/trang',{exact:true}).selectOption('50');await expect(other.getByRole('alert')).toContainText('Workspace local đã đổi ở tab khác');await other.getByRole('button',{name:'Tải lại cấu hình local',exact:true}).click();await expect(other.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('25');}finally{await other.close();}
});
test('local workspace quota failure preserves published data and offers export/retry without clearing the database',async({page})=>{
  await seed(page);await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='workspaces')throw new DOMException('Full workspace quota','QuotaExceededError');return put.apply(this,args);};});
  await page.getByLabel('Số dòng/trang',{exact:true}).selectOption('25');await expect(page.getByRole('alert')).toContainText('Full workspace quota');await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất cấu hình local',exact:true}).click();expect((await download).suggestedFilename()).toBe('local-workspace.json');
  await page.reload();await expect(page.getByLabel('Số dòng/trang',{exact:true})).toHaveValue('10');await expect(page.getByTestId('sync-state')).toContainText('0/1');await expect(page.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');
});
test('a blocked IndexedDB upgrade explains the old-tab lock and resumes without deleting v1 data',async({page})=>{
  // Keep the legacy connection isolated from the dashboard's analytics reader.
  await page.goto('/login');const project=legacyProject();
  await page.evaluate(async project=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('dashboard3d-projects-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({...project,source:new Uint8Array(project.source)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});window.legacyDatabaseForTest=db;
  },project);
  // Keep the old connection alive in a separate tab while the current one upgrades.
  const tab=await page.context().newPage();
  try{await tab.goto('/offline');await expect(tab.getByRole('status')).toContainText('Đóng tab phiên bản cũ');await page.evaluate(()=>window.legacyDatabaseForTest?.close());await tab.getByRole('button',{name:'Tải lại dữ liệu local',exact:true}).click();await expect(tab.getByRole('heading',{name:project.name,exact:true})).toBeVisible();await expect(tab.getByTestId('sync-state')).toContainText('0/1');await expect(tab.getByRole('button',{name:'Dòng 1, cột n',exact:true})).toHaveText('1');}finally{await page.evaluate(()=>window.legacyDatabaseForTest?.close());await tab.close();}
});
