import { defaultWorkspace,normalizeWorkspace,type WorkspaceState,type WorkspaceAdjustment } from '@dashboard/data-core';
import { openProjectDatabase,projectLock,projectStore } from './project-store';
export interface LocalWorkspace extends WorkspaceState {projectId:string;revision:number;boundVersionId:string;updatedAt:string}
export interface LocalWorkspaceRead {workspace:LocalWorkspace;adjustments:WorkspaceAdjustment[]}
export class LocalWorkspaceConflict extends Error {}
async function transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>){
  const db=await openProjectDatabase();
  try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('workspaces',mode),request=work(tx.objectStore('workspaces'));let value:T;request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Không lưu được workspace local'));});}finally{db.close();}
}
async function readUnlocked(projectId:string):Promise<LocalWorkspaceRead>{
  const project=await projectStore.load(projectId);if(!project)throw new Error('Không tìm thấy project local');
  const stored=await transaction('readonly',store=>store.get(projectId) as IDBRequest<LocalWorkspace|undefined>);
  const boundVersionId=project.operations.at(-1)?.id??'original';
  const base:LocalWorkspace=stored??{...defaultWorkspace(),projectId,revision:0,boundVersionId,updatedAt:new Date().toISOString()};
  const normalized=normalizeWorkspace({...base,boundVersionId},project.snapshot);
  return {workspace:normalized.workspace,adjustments:normalized.adjustments};
}
export const localWorkspaceStore={
  read:(projectId:string)=>projectLock(projectId,()=>readUnlocked(projectId)),
  save:(projectId:string,revision:number,boundVersionId:string,patch:Partial<WorkspaceState>)=>projectLock(projectId,async()=>{
    const current=await readUnlocked(projectId);
    if(current.workspace.revision!==revision||current.workspace.boundVersionId!==boundVersionId)throw new LocalWorkspaceConflict('Workspace local đã đổi ở tab khác hoặc dữ liệu có phiên bản mới; tải lại trước khi lưu');
    const project=await projectStore.load(projectId);if(!project)throw new Error('Không tìm thấy project local');
    const proposed={...current.workspace,...patch,revision:revision+1,updatedAt:new Date().toISOString()};
    const normalized=normalizeWorkspace(proposed,project.snapshot);
    await transaction('readwrite',store=>store.put(normalized.workspace));
    return {workspace:normalized.workspace,adjustments:[...current.adjustments,...normalized.adjustments]};
  }),
};
