import { defaultWorkspace,normalizeWorkspace,type WorkspaceState,type WorkspaceAdjustment } from '@dashboard/data-core';
import { projectLock,projectStore } from '../repositories/project-store';
import { workspaceTransaction } from '../repositories/workspace-repository';
export interface LocalWorkspace extends WorkspaceState {projectId:string;revision:number;boundVersionId:string;updatedAt:string}
export interface LocalWorkspaceRead {workspace:LocalWorkspace;adjustments:WorkspaceAdjustment[]}
export class LocalWorkspaceConflict extends Error {}
async function readUnlocked(projectId:string):Promise<LocalWorkspaceRead>{
  const project=await projectStore.load(projectId);if(!project)throw new Error('Không tìm thấy project local');
  const stored=await workspaceTransaction('readonly',store=>store.get(projectId) as IDBRequest<LocalWorkspace|undefined>);
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
    await workspaceTransaction('readwrite',store=>store.put(normalized.workspace));
    return {workspace:normalized.workspace,adjustments:[...current.adjustments,...normalized.adjustments]};
  }),
};
