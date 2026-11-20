import type {ChangeEvent} from 'react';

import { assertOriginalSource, recoverOriginalSource, hasOriginalSource } from '../services/project-backup';

import { useState } from 'react';

import { projectLock, projectStore, type LocalProject } from '../repositories/project-store';
import { backupProject, downloadFile } from '../services/project-backup';

export type ProjectRecoveryProps = {project:LocalProject;onChanged():Promise<void>;onRemoved():Promise<void>;onMessage(message:string):void};
export function useProjectRecovery({project,onChanged,onRemoved,onMessage}:{project:LocalProject;onChanged():Promise<void>;onRemoved():Promise<void>;onMessage(message:string):void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[removing,setRemoving]=useState(false),[confirmed,setConfirmed]=useState(false);
  async function action(work:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await work();}catch(error){setError(error instanceof Error?error.message:'Không thực hiện được phục hồi');}finally{setBusy(false);}}
  async function exportBackup(){await projectLock(project.id,async()=>{const latest=await projectStore.load(project.id);if(!latest)throw new Error('Không tìm thấy project');downloadFile(`${latest.name}.workspace-backup.json`,backupProject(latest),'application/json');});}

  const downloadOriginalCsv:()=>void = ()=>void action(async()=>{const latest=await projectStore.load(project.id);if(!latest)throw new Error('Không tìm thấy project');await assertOriginalSource(latest);downloadFile(latest.fileName,new Uint8Array(latest.source),'text/csv;charset=utf-8');});
const recoverSourceFile:(event:ChangeEvent<HTMLInputElement>)=>void = event=>{const file=event.target.files?.[0];if(file)void action(async()=>{await recoverOriginalSource(project.id,file);await onChanged();onMessage('Đã phục hồi đúng CSV nguồn; lịch sử và khóa retry được giữ');});};
const removeLocalProject:()=>void = ()=>void action(async()=>{await projectLock(project.id,()=>projectStore.remove(project.id));setRemoving(false);await onRemoved();onMessage('Đã xóa project trên thiết bị; dữ liệu server được giữ nguyên');});
return {hasSource:hasOriginalSource(project),project,onChanged,onRemoved,onMessage,busy,error,removing,setRemoving,confirmed,setConfirmed,action,exportBackup,downloadOriginalCsv,recoverSourceFile,removeLocalProject};
}
export type ProjectRecoveryModel = ReturnType<typeof useProjectRecovery>;
