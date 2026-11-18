import type {AccountAction} from '../../auth';
import type {ImportOptions} from '../../datasets';
import { authApi } from '../../auth';

import { createLocalProject, restoreLocalProject, ProjectApi, syncLocalProject } from '../project-sync';

import { useEffect, useId, useState } from 'react';

import { projectStore, type LocalProject } from '../project-store';

import { session, useSession } from '../../auth';

import { subscribeProjectProgress } from '../project-events';

export type OfflineWorkspaceProps = Record<string, never>;
export function useOfflineWorkspace(){
  const currentSession=useSession(),id=useId();
  const [projects,setProjects]=useState<LocalProject[]>([]),[selected,setSelected]=useState('');
  const [name,setName]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const token=session.accessToken()??'',account=currentSession.user?.email??'';
  const [message,setMessage]=useState('Sẵn sàng lưu CSV và xử lý khi mất mạng'),[busy,setBusy]=useState(false);
  const [restoreTarget,setRestoreTarget]=useState('0');
  const current=projects.find(project=>project.id===selected)??projects[0];
  async function reload(id?:string){const all=await projectStore.list();setProjects(all);if(id)setSelected(id);}
  useEffect(()=>{void projectStore.list().then(setProjects).catch(error=>setMessage(String(error)));if('serviceWorker' in navigator)void navigator.serviceWorker.register('/offline-worker.js').catch(error=>setMessage(String(error)));},[]);
  useEffect(()=>subscribeProjectProgress(event=>{if(event.removed)void projectStore.list().then(setProjects).catch(error=>setMessage(String(error)));}),[]);
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('Đang thực hiện…');try{await work();}catch(error){setMessage(error instanceof Error?error.message:String(error));}finally{setBusy(false);}}
  async function authenticate(kind:'register'|'login'|'refresh'){
    if(kind==='register'){await authApi.register({email,password});setMessage('Đã đăng ký; chọn Đăng nhập để tiếp tục');}
    else {if(kind==='login')await session.login({email,password});else await session.recover();setPassword('');setMessage('Đã đăng nhập');}
  }

  const onAccountComplete:(action:AccountAction,notice:string)=>Promise<void> = async (_action,notice)=>{await reload();setMessage(notice);};
const importLocalCsv:(file:File,options:ImportOptions,key:string)=>Promise<void> = async(file,options,key)=>{const project=await createLocalProject(file,name,options,key);await reload(project.id);setMessage('Đã lưu CSV offline');};
const reloadLocalProjects:()=>void = ()=>void action(async()=>{await reload();setMessage('Đã tải lại dữ liệu local');});
const onBackupImported:(project:LocalProject)=>Promise<void> = async project=>{await reload(project.id);setMessage('Đã phục hồi backup trên thiết bị; chưa gửi lên server');};
const syncSelectedProject:()=>void = ()=>{if(!current)return;return void action(async()=>{const result=await syncLocalProject(current.id,new ProjectApi(()=>token));await reload(current.id);setMessage(result.status==='synced'?'Đã đồng bộ và xác minh dữ liệu server':`Chưa đồng bộ: ${result.error}`);});};
const onLocalApplied:()=>Promise<void> = async()=>{if(!current)return;await reload(current.id);setMessage('Đã lưu thay đổi offline');};
const restoreSelectedVersion:()=>void = ()=>{if(!current)return;return void action(async()=>{await restoreLocalProject(current.id,Number(restoreTarget));await reload(current.id);setMessage('Đã lưu restore offline');});};
return {id,projects,setSelected,name,setName,email,setEmail,password,setPassword,token,account,message,setMessage,busy,restoreTarget,setRestoreTarget,current,reload,action,authenticate,onAccountComplete,importLocalCsv,reloadLocalProjects,onBackupImported,syncSelectedProject,onLocalApplied,restoreSelectedVersion};
}
export type OfflineWorkspaceModel = ReturnType<typeof useOfflineWorkspace>;
