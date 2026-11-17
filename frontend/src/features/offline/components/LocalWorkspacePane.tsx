import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { queryRows,type WorkspaceState } from '@dashboard/data-core';
import { DataTableView } from '../../datasets';
import { ProcessingPanel } from '../../processing';
import { AnalysisPanel,localAnalysis } from '../../analysis';
import { Button,Feedback,WorkspaceLayout } from '../../../shared/ui';
import { localWorkspaceStore,type LocalWorkspace } from '../local-workspace';
import { localProcessing,localVersion } from '../processing-adapter';
import type { LocalProject } from '../project-store';

export function LocalWorkspacePane({project,onApplied,history}:{project:LocalProject;onApplied():Promise<void>;history:ReactNode}){
  const [navigationLocked,setNavigationLocked]=useState(false);
  const [rowEditingLocked,setRowEditingLocked]=useState(false);
  const [workspace,setWorkspace]=useState<LocalWorkspace>(),[error,setError]=useState(''),[status,setStatus]=useState('Đang tải workspace local…'),[adjustments,setAdjustments]=useState<string[]>([]),[rowDetail,setRowDetail]=useState('');
  const current=useRef<LocalWorkspace|undefined>(undefined),pending=useRef<Partial<WorkspaceState>>({}),running=useRef(false),blocked=useRef(false),active=useRef(true);
  const load=useCallback(async()=>{const value=await localWorkspaceStore.read(project.id);if(!active.current)return;current.current=value.workspace;pending.current={};blocked.current=false;setWorkspace(value.workspace);setError('');setAdjustments(value.adjustments.map(item=>`${item.path}: ${item.reason}`));setStatus('Đã tải workspace local');},[project.id]);
  useEffect(()=>{active.current=true;void localWorkspaceStore.read(project.id).then(value=>{if(!active.current)return;current.current=value.workspace;setWorkspace(value.workspace);setAdjustments(value.adjustments.map(item=>`${item.path}: ${item.reason}`));setStatus('Đã tải workspace local');}).catch(error=>{if(active.current)setError(String(error));});return()=>{active.current=false;};},[project.id]);
  const version=localVersion(project),processor=useMemo(()=>localProcessing(project.id,version),[project.id,version]);
  const analysis=useMemo(()=>localAnalysis(project.snapshot,version,project.source?.byteLength??0),[project.snapshot,project.source,version]);
  async function flush(){
    if(running.current||blocked.current||!current.current)return;running.current=true;
    try{while(Object.keys(pending.current).length&&active.current){const patch=pending.current;pending.current={};const base=current.current;setStatus('Đang lưu workspace local…');
      try{const value=await localWorkspaceStore.save(project.id,base.revision,base.boundVersionId,patch);if(!active.current)return;current.current={...value.workspace,...pending.current};setWorkspace(current.current);setAdjustments(value.adjustments.map(item=>`${item.path}: ${item.reason}`));setStatus('Đã lưu workspace local');}
      catch(error){pending.current={...patch,...pending.current};throw error;}
    }}catch(error){if(active.current){blocked.current=true;setError(error instanceof Error?error.message:'Không lưu được workspace local');setStatus('Chưa lưu cấu hình local · giữ trang để xem hoặc tải lại');}}
    finally{running.current=false;}
  }
  function save(patch:Partial<WorkspaceState>){if(!current.current)return;pending.current={...pending.current,...patch};current.current={...current.current,...patch};setWorkspace(current.current);void flush();}
  function exportWorkspace(){const url=URL.createObjectURL(new Blob([JSON.stringify(current.current,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='local-workspace.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const data=useMemo(()=>{if(!workspace)return undefined;const state=workspace.tableState,rows=queryRows(project.snapshot,state.filters,state.sort??undefined);return {rows:rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize),totalRows:project.snapshot.rows.length,filteredRows:rows.length,totalPages:Math.ceil(rows.length/state.pageSize)};},[project.snapshot,workspace]);
  if(!workspace)return <section><p>{status}</p>{error&&<Feedback error>{error}</Feedback>}<Button variant="secondary" onClick={()=>void load().catch(error=>setError(String(error)))}>Tải lại cấu hình local</Button></section>;
  function select(rowId:string,columnId:string){if(rowEditingLocked){setError('Hãy lưu hoặc bỏ thay đổi ô trước khi chọn dòng khác.');return;}if(!workspace)return;save({selection:{...workspace.selection,cell:{rowId,columnId}}});const row=project.snapshot.rows.find(row=>row.rowId===rowId);setRowDetail(row?`Dòng ${row.position+1} · ${JSON.stringify(row.cells[columnId])}`:'Không tìm thấy dòng');}
  return <><p className="muted" aria-live="polite">{status}</p>{error&&<><Feedback error>{error} · CSV, snapshot và lịch sử vẫn được giữ; cấu hình đang xem chưa được lưu.</Feedback><div className="toolbar"><Button variant="secondary" onClick={()=>{blocked.current=false;setError('');void flush();}}>Thử lưu lại cấu hình local</Button><Button variant="secondary" onClick={exportWorkspace}>Xuất cấu hình local</Button><Button variant="secondary" onClick={()=>void load().catch(error=>setError(String(error)))}>Tải lại cấu hình local</Button></div></>}{adjustments.length>0&&<p className="notice">{adjustments.join('; ')}</p>}
    <WorkspaceLayout activeTab={workspace.activeTab} onTab={activeTab=>save({activeTab,chartConfig:{...workspace.chartConfig,colorMode:activeTab==='missing'?'missing':activeTab==='outliers'?'outlier':'normal'}})} navigationLocked={navigationLocked||rowEditingLocked}
      analysis={<AnalysisPanel key={`analysis:${workspace.activeTab}`} editor={processor} onEdited={onApplied} initialRowId={workspace.selection.cell?.rowId} onEditingLock={setRowEditingLocked} adapter={analysis} columns={project.snapshot.columns} initialConfig={workspace.chartConfig} initialTab={workspace.selection.cell?'points':workspace.activeTab==='collection'?'summary':'points'} onConfig={chartConfig=>save({chartConfig})} onRow={row=>{const column=workspace.chartConfig.xColumnId??project.snapshot.columns.find(column=>column.logicalType==='number')?.columnId;if(column)select(row.rowId,column);}}/>}
      processing={workspace.activeTab!=='collection'&&workspace.activeTab!=='history'&&<ProcessingPanel key={workspace.activeTab} group={workspace.activeTab} onNavigationLock={setNavigationLocked} adapter={processor} columns={project.snapshot.columns} selectedCell={workspace.selection.cell} selectedValue={workspace.selection.cell?project.snapshot.rows.find(row=>row.rowId===workspace.selection.cell?.rowId)?.cells[workspace.selection.cell.columnId]:undefined} onApplied={onApplied} local/>}
      table={<><DataTableView title="Bảng dữ liệu local" columns={project.snapshot.columns} data={data} state={workspace.tableState} selected={workspace.selection.cell} onState={tableState=>save({tableState})} onSelect={select}/>{rowDetail&&<p className="notice">{rowDetail}</p>}</>}
      history={history}/>
  </>;
}
