import { useLocalWorkspace, type LocalWorkspaceProps } from '../hooks/useLocalWorkspace';

import { DataTableView } from '../../datasets';
import { ProcessingPage } from '../../processing';
import { AnalysisPage } from '../../analysis';
import { Button, Feedback, WorkspaceLayout } from '../../../shared/ui';

export function LocalWorkspacePane(props:LocalWorkspaceProps){
  const { project, onApplied, history, navigationLocked, setNavigationLocked, rowEditingLocked, setRowEditingLocked, workspace, error, setError, status, adjustments, rowDetail, load, processor, analysis, save, exportWorkspace, data, select, retryWorkspaceSave }=useLocalWorkspace(props);
if(!workspace)return <section><p>{status}</p>{error&&<Feedback error>{error}</Feedback>}<Button variant="secondary" onClick={()=>void load().catch(error=>setError(String(error)))}>Tải lại cấu hình local</Button></section>;
return <><p className="muted" aria-live="polite">{status}</p>{error&&<><Feedback error>{error} · CSV, snapshot và lịch sử vẫn được giữ; cấu hình đang xem chưa được lưu.</Feedback><div className="toolbar"><Button variant="secondary" onClick={retryWorkspaceSave}>Thử lưu lại cấu hình local</Button><Button variant="secondary" onClick={exportWorkspace}>Xuất cấu hình local</Button><Button variant="secondary" onClick={()=>void load().catch(error=>setError(String(error)))}>Tải lại cấu hình local</Button></div></>}{adjustments.length>0&&<p className="notice">{adjustments.join('; ')}</p>}
    <WorkspaceLayout activeTab={workspace.activeTab} onTab={activeTab=>save({activeTab,chartConfig:{...workspace.chartConfig,colorMode:activeTab==='missing'?'missing':activeTab==='outliers'?'outlier':'normal'}})} navigationLocked={navigationLocked||rowEditingLocked}
      analysis={<AnalysisPage key={`analysis:${workspace.activeTab}`} editor={processor} onEdited={onApplied} initialRowId={workspace.selection.cell?.rowId} onEditingLock={setRowEditingLocked} adapter={analysis} columns={project.snapshot.columns} initialConfig={workspace.chartConfig} initialTab={workspace.selection.cell?'points':workspace.activeTab==='collection'?'summary':'points'} onConfig={chartConfig=>save({chartConfig})} onRow={row=>{const column=workspace.chartConfig.xColumnId??project.snapshot.columns.find(column=>column.logicalType==='number')?.columnId;if(column)select(row.rowId,column);}}/>}
      processing={workspace.activeTab!=='collection'&&workspace.activeTab!=='history'&&<ProcessingPage key={workspace.activeTab} group={workspace.activeTab} onNavigationLock={setNavigationLocked} adapter={processor} columns={project.snapshot.columns} selectedCell={workspace.selection.cell} selectedValue={workspace.selection.cell?project.snapshot.rows.find(row=>row.rowId===workspace.selection.cell?.rowId)?.cells[workspace.selection.cell.columnId]:undefined} onApplied={onApplied} local/>}
      table={<><DataTableView title="Bảng dữ liệu local" columns={project.snapshot.columns} data={data} state={workspace.tableState} selected={workspace.selection.cell} onState={tableState=>save({tableState})} onSelect={select}/>{rowDetail&&<p className="notice">{rowDetail}</p>}</>}
      history={history}/>
  </>;
}
