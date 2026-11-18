import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { Cell } from '@dashboard/data-core';
import { projectsApi, workspaceDrafts, draftMatches, type WorkspaceDraft, type WorkspacePatch, type ProjectDetail, type Workspace } from '../../features/projects';
import { datasetsApi, type Metadata, type RowsResult } from '../../features/datasets';
import { onlineProcessing } from '../../features/processing';

import { onlineAnalysis } from '../../features/analysis';
import { useSession } from '../../features/auth';
import { ApiError } from '../../shared/api';

export type WorkspaceProps = Record<string, never>;
export function useWorkspace(){
  const {projectId=''}=useParams();
  const userId=useSession().user?._id??'';
  const [draftId]=useState(()=>crypto.randomUUID());
  const [drafts,setDrafts]=useState<WorkspaceDraft[]>([]),[draftProblem,setDraftProblem]=useState('');
  const [detail,setDetail]=useState<ProjectDetail>(),[metadata,setMetadata]=useState<Metadata>(),[rows,setRows]=useState<RowsResult>();
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[saveStatus,setSaveStatus]=useState('Đã tải workspace');

  const [cellDetail,setCellDetail]=useState<string>('');
  const [inspectedCell,setInspectedCell]=useState<{rowId:string;columnId:string;version:string;value:Cell}>();
  const [readGeneration,setReadGeneration]=useState(0);
  const [navigationLocked,setNavigationLocked]=useState(false);
  const [rowEditingLocked,setRowEditingLocked]=useState(false);
  const [pickedRow,setPickedRow]=useState<{projectId:string;rowId:string}>();
  const pickedRowId=pickedRow?.projectId===projectId?pickedRow.rowId:undefined;
  const generation=useRef(0),current=useRef<ProjectDetail|undefined>(undefined);
  const pending=useRef<Partial<Pick<Workspace,'tableState'|'selection'|'chartConfig'|'activeTab'>>>({});
  const inFlight=useRef<WorkspacePatch>({});
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),running=useRef(false),blocked=useRef(false);
  const install=useCallback((value:ProjectDetail,stamp:number)=>{
    if(stamp!==generation.current)return;current.current=value;pending.current={};blocked.current=false;setError('');setDetail(value);setReadGeneration(value=>value+1);setSaveStatus('Đã tải workspace');setLoading(false);
    try{
      const saved=workspaceDrafts.list(userId,projectId),unconfirmed:WorkspaceDraft[]=[];
      // Other tabs own independent mutable draft records. Do not delete them on read.
      for(const draft of saved)if(!draftMatches(value.workspace,draft))unconfirmed.push(draft);
      setDrafts(unconfirmed);setDraftProblem('');
    }catch(error){setDraftProblem(error instanceof Error?error.message:'Không đọc được bản nháp');}
    inFlight.current={};
  },[userId,projectId]);
  const load=useCallback(async()=>{
    const stamp=++generation.current;setRows(undefined);setMetadata(undefined);setCellDetail('');
    try{install(await projectsApi.detail(projectId),stamp);}
    catch(error){if(stamp===generation.current)setError(error instanceof Error?error.message:'Không mở được workspace');}
    finally{if(stamp===generation.current)setLoading(false);}
  },[projectId,install]);
  const invalidate=useCallback(()=>{generation.current++;clearTimeout(timer.current);},[]);
  useEffect(()=>{
    const stamp=++generation.current;
    void projectsApi.detail(projectId).then(value=>install(value,stamp)).catch(error=>{if(stamp===generation.current){setError(error instanceof Error?error.message:'Không mở được workspace');setLoading(false);}});
    return invalidate;
  },[projectId,install,invalidate]);
  const dataset=detail?.dataset,version=dataset?.currentVersionId;
  const datasetId=dataset?._id;
  const processor=useMemo(()=>datasetId&&version?onlineProcessing(datasetId,version):undefined,[datasetId,version]);
  const analysis=useMemo(()=>datasetId&&version?onlineAnalysis(datasetId,version):undefined,[datasetId,version]);
  const queryState=JSON.stringify(detail?.workspace.tableState);
  useEffect(()=>{
    if(!datasetId||!version)return;
    const controller=new AbortController();
    void datasetsApi.metadata(datasetId,version,controller.signal).then(value=>{if(!controller.signal.aborted)setMetadata(value);}).catch(error=>{if(!controller.signal.aborted)setError(String(error));});
    return()=>controller.abort();
  },[datasetId,version,readGeneration]);
  useEffect(()=>{
    if(!datasetId||!version||!queryState)return;
    const controller=new AbortController();const state=JSON.parse(queryState) as Workspace['tableState'];
    const query=new URLSearchParams({page:String(state.page),limit:String(state.pageSize),filters:JSON.stringify(state.filters)});if(state.sort)query.set('sort',`${state.sort.columnId}:${state.sort.direction}`);
    void datasetsApi.rows(datasetId,version,query,controller.signal).then(value=>{if(!controller.signal.aborted)setRows(value);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Không đọc được bảng');});
    return()=>controller.abort();
  },[datasetId,version,queryState,readGeneration]);
  function persist(patch:WorkspacePatch,workspace:Workspace){
    try{
      if(Object.keys(patch).length)workspaceDrafts.save({schema:1,id:draftId,userId,projectId,revision:workspace.revision,boundVersionId:workspace.boundVersionId,patch,updatedAt:new Date().toISOString()});
      else workspaceDrafts.remove(userId,projectId,draftId);
      setDraftProblem('');
      return true;
    }catch(error){setDraftProblem(`Chưa lưu được bản nháp trên máy: ${error instanceof Error?error.message:'Storage không khả dụng'}. Hãy giữ trang mở hoặc xuất bản nháp.`);return false;}
  }
  const selectedRow=detail?.workspace.selection.cell?.rowId,selectedColumn=detail?.workspace.selection.cell?.columnId;
  const selectedValue=inspectedCell?.rowId===selectedRow&&inspectedCell?.columnId===selectedColumn&&inspectedCell?.version===version?inspectedCell?.value:undefined;
  useEffect(()=>{
    if(!datasetId||!version||!selectedRow||!selectedColumn)return;
    const abort=new AbortController();
    void datasetsApi.row(datasetId,version,selectedRow,abort.signal).then(({row})=>{if(abort.signal.aborted)return;const value=row.cells[selectedColumn];if(!value)return;setInspectedCell({rowId:selectedRow,columnId:selectedColumn,version,value});setCellDetail(`Dòng ${row.position+1} · ${value.kind} · ${JSON.stringify(value.value)}`);}).catch(error=>{if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Không tải được ô đã chọn');});
    return()=>abort.abort();
  },[datasetId,version,selectedRow,selectedColumn,readGeneration]);
  async function flush(){
    if(running.current||blocked.current||!current.current)return;
    running.current=true;const stamp=generation.current;
    try{while(Object.keys(pending.current).length&&stamp===generation.current){
      const patch=pending.current;inFlight.current=patch;pending.current={};setSaveStatus('Đang lưu…');
      const base:ProjectDetail=current.current!;
      const result=await projectsApi.workspace(projectId,{revision:base.workspace.revision,boundVersionId:base.workspace.boundVersionId,...patch});
      if(stamp!==generation.current)return;
      inFlight.current={};
      const workspace={...result.workspace,...pending.current};
      current.current={...base,workspace,workspaceAdjusted:result.workspaceAdjusted,adjustments:result.adjustments};setDetail(current.current);setSaveStatus(result.workspaceAdjusted?'Đã lưu · có điều chỉnh tham chiếu':'Đã lưu workspace');
      persist(pending.current,result.workspace);
    }}catch(error){if(stamp===generation.current){
      pending.current={...inFlight.current,...pending.current};inFlight.current={};
      if(current.current)persist(pending.current,current.current.workspace);
      blocked.current=true;setSaveStatus(error instanceof ApiError&&error.status===409?'Xung đột · tải lại workspace trước khi lưu tiếp':'Chưa lưu · giữ bản nháp để khôi phục');setError(error instanceof Error?error.message:'Không lưu được workspace');
    }}finally{running.current=false;if(Object.keys(pending.current).length&&!blocked.current)void flush();}
  }
  function save(patch:WorkspacePatch){
    if(!current.current)return;pending.current={...pending.current,...patch};
    const persisted=persist({...inFlight.current,...pending.current},current.current.workspace);
    current.current={...current.current,workspace:{...current.current.workspace,...patch}};setDetail(current.current);setSaveStatus(blocked.current?'Chưa lưu · tải lại workspace để khôi phục bản nháp':'Có thay đổi chưa lưu');clearTimeout(timer.current);timer.current=setTimeout(()=>{void flush();},500);return persisted;
  }
  function removeDraft(draft:WorkspaceDraft){try{workspaceDrafts.remove(userId,projectId,draft.id);setDrafts(values=>values.filter(value=>value.id!==draft.id));}catch(error){setDraftProblem(String(error));}}
  function recoverDraft(draft:WorkspaceDraft){
    if(!current.current||current.current.workspace.boundVersionId!==draft.boundVersionId)return;
    // Explicit recovery uses the server revision just loaded; stale drafts never autosave on bootstrap.
    blocked.current=false;setError('');const persisted=save(draft.patch);
    if(persisted){if(draft.id!==draftId)removeDraft(draft);else setDrafts(values=>values.filter(value=>value.id!==draft.id));}
  }
  function exportDraft(draft?:WorkspaceDraft){
    const data=draft??{schema:1,projectId,userId,revision:current.current?.workspace.revision,boundVersionId:current.current?.workspace.boundVersionId,patch:{...inFlight.current,...pending.current},updatedAt:new Date().toISOString()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='workspace-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  useEffect(()=>{
    function leaving(event:BeforeUnloadEvent){if(draftProblem&&Object.keys({...inFlight.current,...pending.current}).length){event.preventDefault();event.returnValue='';}}
    function navigating(event:MouseEvent){
      if(!draftProblem||!Object.keys({...inFlight.current,...pending.current}).length)return;
      const link=(event.target as Element|null)?.closest('a[href]');if(!link||link.getAttribute('href')?.startsWith('#'))return;
      if(!window.confirm('Bản nháp chưa lưu được trên máy. Rời trang có thể mất thay đổi; hãy xuất bản nháp trước. Vẫn rời trang?')){event.preventDefault();event.stopPropagation();}
    }
    window.addEventListener('beforeunload',leaving);document.addEventListener('click',navigating,true);return()=>{window.removeEventListener('beforeunload',leaving);document.removeEventListener('click',navigating,true);};
  },[draftProblem]);
  function selected(rowId:string,columnId:string){if(rowEditingLocked){setError('Hãy lưu hoặc bỏ thay đổi ô trước khi chọn dòng khác.');return;}if(!detail)return;save({selection:{...detail.workspace.selection,cell:{rowId,columnId}}});}

  return {projectId,drafts,draftProblem,detail,metadata,rows,error,loading,saveStatus,cellDetail,setCellDetail,readGeneration,navigationLocked,setNavigationLocked,rowEditingLocked,setRowEditingLocked,setPickedRow,pickedRowId,load,dataset,version,datasetId,processor,analysis,selectedValue,save,removeDraft,recoverDraft,exportDraft,selected};
}
export type WorkspaceModel = ReturnType<typeof useWorkspace>;
