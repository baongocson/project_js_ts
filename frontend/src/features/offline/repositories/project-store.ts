import type { Snapshot, ProcessingSpecification, IdMapping,CsvOptions } from '@dashboard/data-core';
import { publishProjectProgress,publishProjectRemoval } from '../domain/project-events';

export type LocalOperation = {
  id: string; snapshot: Snapshot;
  previewKey: string; applyKey: string;
  previewId?: string; resultVersionId?: string; phase: 'queued'|'preview-sent'|'apply-sent'|'confirmed';
} & ({kind:'process';specification:ProcessingSpecification;serverSpecification?:ProcessingSpecification}|{kind:'restore';target:number});
export interface LocalProject {
  id: string; name: string; fileName: string; source: Uint8Array; sourceHash: string;
  importOptions?:CsvOptions; original: Snapshot; snapshot: Snapshot; engineVersion: string; operations: LocalOperation[];
  createKey: string; importKey: string; accountId?: string; projectId?: string; datasetId?: string;
  serverVersionId?: string; importVersionId?:string; mapping?: IdMapping; cursor: number;
  status: 'local'|'syncing'|'synced'|'retry'|'conflict'|'blocked'; error?: string;
  restoredBackup?:boolean;
  autoSync?:boolean;
  syncRetry?:{attempt:number;nextAt:number};
  retryAfterMs?:number;
}
// Keep the original database name. Version 2 adds a store without rewriting engine/history/source.
const name='dashboard3d-projects-v1';
export async function openProjectDatabase():Promise<IDBDatabase>{
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const req=indexedDB.open(name,2);let blocked=false;
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects',{keyPath:'id'});
      if(!req.result.objectStoreNames.contains('workspaces'))req.result.createObjectStore('workspaces',{keyPath:'projectId'});
    };
    req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();if(blocked)db.close();else resolve(db);};
    req.onerror=()=>reject(req.error);req.onblocked=()=>{blocked=true;reject(new Error('Đóng tab phiên bản cũ rồi thử lại; chưa xóa dữ liệu offline'));};
  });
}
async function transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await openProjectDatabase();
  try{return await new Promise<T>((resolve,reject)=>{
    const tx=db.transaction('projects',mode),req=work(tx.objectStore('projects'));let result:T;
    req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(tx.error??new Error('Không lưu được dữ liệu offline'));tx.onerror=()=>reject(tx.error);
  });}catch(error){
    if(error instanceof DOMException&&error.name==='QuotaExceededError')throw new DOMException(`Không đủ dung lượng trên thiết bị; thao tác mới chưa lưu. Dữ liệu đã lưu vẫn được giữ. Xuất backup hoặc dọn dữ liệu khác rồi thử lại. (${error.message})`,'QuotaExceededError');
    throw error;
  }finally{db.close();}
}
export const projectStore={
  load:(id:string)=>transaction('readonly',store=>store.get(id) as IDBRequest<LocalProject|undefined>),
  list:()=>transaction('readonly',store=>store.getAll() as IDBRequest<LocalProject[]>),
  save:async(project:LocalProject)=>{await transaction('readwrite',store=>store.put(structuredClone(project)));publishProjectProgress(project);},
  remove:async(id:string)=>{
    const db=await openProjectDatabase();
    try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['projects','workspaces'],'readwrite');tx.objectStore('projects').delete(id);tx.objectStore('workspaces').delete(id);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});publishProjectRemoval(id);}finally{db.close();}
  },
};
export async function projectLock<T>(id:string,work:()=>Promise<T>):Promise<T>{
  if(!navigator.locks)throw new Error('Trình duyệt cần hỗ trợ Web Locks để đồng bộ an toàn');
  return navigator.locks.request(`dashboard-project:${id}`,work);
}
