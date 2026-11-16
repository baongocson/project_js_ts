import type { Snapshot, ProcessingSpecification, IdMapping } from '@dashboard/data-core';

export type LocalOperation = {
  id: string; snapshot: Snapshot;
  previewKey: string; applyKey: string;
  previewId?: string; resultVersionId?: string; phase: 'queued'|'preview-sent'|'apply-sent'|'confirmed';
} & ({kind:'process';specification:ProcessingSpecification;serverSpecification?:ProcessingSpecification}|{kind:'restore';target:number});
export interface LocalProject {
  id: string; name: string; fileName: string; source: Uint8Array; sourceHash: string;
  original: Snapshot; snapshot: Snapshot; engineVersion: string; operations: LocalOperation[];
  createKey: string; importKey: string; accountId?: string; projectId?: string; datasetId?: string;
  serverVersionId?: string; importVersionId?:string; mapping?: IdMapping; cursor: number;
  status: 'local'|'syncing'|'synced'|'retry'|'conflict'|'blocked'; error?: string;
}
const name='dashboard3d-projects-v1';
async function transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
    const req=indexedDB.open(name,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('projects',{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Đóng tab dữ liệu khác rồi thử lại'));
  });
  try{return await new Promise<T>((resolve,reject)=>{
    const tx=db.transaction('projects',mode),req=work(tx.objectStore('projects'));let result:T;
    req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(tx.error??new Error('Không lưu được dữ liệu offline'));tx.onerror=()=>reject(tx.error);
  });}finally{db.close();}
}
export const projectStore={
  load:(id:string)=>transaction('readonly',store=>store.get(id) as IDBRequest<LocalProject|undefined>),
  list:()=>transaction('readonly',store=>store.getAll() as IDBRequest<LocalProject[]>),
  save:async(project:LocalProject)=>{await transaction('readwrite',store=>store.put(structuredClone(project)));},
};
export async function projectLock<T>(id:string,work:()=>Promise<T>):Promise<T>{
  if(!navigator.locks)throw new Error('Trình duyệt cần hỗ trợ Web Locks để đồng bộ an toàn');
  return navigator.locks.request(`dashboard-project:${id}`,work);
}
