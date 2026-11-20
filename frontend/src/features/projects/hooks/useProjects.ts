

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../../shared/api';

import { projectService,normalizeProjectName } from '../services/project-service';
import type { Project, Page } from '../types';

export type ProjectsProps = Record<string, never>;
export function useProjects(){
  const navigate=useNavigate();
  const [page,setPage]=useState(1),[sort,setSort]=useState('-updatedAt'),[revision,setRevision]=useState(0);
  const [data,setData]=useState<Page<Project>>(),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState<Project>();
  const [renaming,setRenaming]=useState<Project>(),[rename,setRename]=useState('');
  const pending=useRef<{name:string;key:string}|undefined>(undefined),working=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    void(async()=>{setLoading(true);setError('');try{setData(await projectService.list(new URLSearchParams({page:String(page),limit:'12',sort}),controller.signal));}catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Không tải được project');}finally{if(!controller.signal.aborted)setLoading(false);}})();
    return()=>controller.abort();
  },[page,sort,revision]);
  async function create(event:FormEvent){
    event.preventDefault();if(working.current)return;
    let value:string;try{value=normalizeProjectName(name);}catch(error){setError((error as Error).message);return;}
    if(pending.current?.name!==value)pending.current={name:value,key:crypto.randomUUID()};
    working.current=true;setBusy(true);setError('');
    try{const result=await projectService.create(value,pending.current.key);pending.current=undefined;await navigate(`/projects/${result.project._id}`);}
    catch(error){setError(error instanceof Error?error.message:'Không tạo được project');if(error instanceof ApiError&&error.status<500&&error.code!=='IDEMPOTENCY_PENDING')pending.current=undefined;}
    finally{working.current=false;setBusy(false);}
  }
  async function mutate(work:()=>Promise<unknown>){if(working.current)return;working.current=true;setBusy(true);setError('');try{await work();setRenaming(undefined);setDeleting(undefined);setRevision(value=>value+1);}catch(error){setError(error instanceof Error?error.message:'Không hoàn tất yêu cầu');}finally{working.current=false;setBusy(false);}}

  const renameProject:()=>void = ()=>{if(!renaming)return;return void mutate(()=>projectService.rename(renaming._id,rename.trim()));};
const deleteProject:()=>void = ()=>{if(!deleting)return;return void mutate(()=>projectService.delete(deleting._id));};
return {page,setPage,sort,setSort,data,loading,error,name,setName,busy,deleting,setDeleting,renaming,setRenaming,rename,setRename,create,mutate,renameProject,deleteProject};
}
export type ProjectsModel = ReturnType<typeof useProjects>;
