import { useEffect,useState } from 'react';
import { Button } from '../../../shared/ui';
import { session } from '../../auth';
import { projectLock,projectStore,type LocalProject } from '../project-store';
import { ProjectApi } from '../project-sync';
import { downloadFile } from '../project-backup';
import { subscribeProjectProgress,type ProjectProgress } from '../project-events';

const phases:Record<string,string>={queued:'Đang chờ', 'preview-sent':'Đang kiểm preview','apply-sent':'Đã gửi Apply · đang xác nhận',confirmed:'Đã xác nhận'};
const errors:Record<string,string>={LOCAL_CHECKPOINT_UNSAVED:'Không lưu được checkpoint trên thiết bị. Server có thể đã commit; giữ khóa và retry sau khi có dung lượng. Bản local vẫn được giữ.',LOCAL_SOURCE_MISSING:'Thiếu CSV nguồn; phục hồi đúng file ở phần sao lưu.',LOCAL_SOURCE_MISMATCH:'CSV nguồn không khớp checksum; phục hồi đúng file.',BASE_VERSION_STALE:'Server đã có phiên bản khác. Giữ bản local, xuất backup hoặc tải bản server để đối chiếu.',SYNC_ACCOUNT_MISMATCH:'Đăng nhập đúng tài khoản đã gắn với project này.',SYNC_ENGINE_MISMATCH:'Engine khác phiên bản; giữ bản local và backup để xem xét.',SYNC_PREVIEW_MISMATCH:'Preview server khác dữ liệu local. Client đã dừng trước khi publish.',ACCOUNT_MISMATCH:'Phiên tài khoản đã đổi; chuỗi đồng bộ đã bị chặn.'};
export function SyncCenter({project,busy,authenticated,onSync,onReload,onMessage}:{project:LocalProject;busy:boolean;authenticated:boolean;onSync():void;onReload():Promise<void>;onMessage(message:string):void}){
  const [progress,setProgress]=useState<ProjectProgress>(),[page,setPage]=useState(1),[reading,setReading]=useState(false),[optimisticAuto,setOptimisticAuto]=useState<boolean>(),[settingsBusy,setSettingsBusy]=useState(false);
  useEffect(()=>subscribeProjectProgress(value=>{if(value.id===project.id)setProgress(value);}),[project.id]);
  const live=progress?.id===project.id?progress:undefined,status=live?.status??project.status,cursor=live?.cursor??project.cursor,total=live?.total??project.operations.length,error=live?live.error:project.error;
  const stale=live&&live.version!==(project.operations.at(-1)?.id??'original');
  const auto=live?!!live.autoSync:!!project.autoSync,retry=live?live.syncRetry:project.syncRetry;
  async function automatic(value:boolean){
    if(settingsBusy)return;setOptimisticAuto(value);setSettingsBusy(true);
    try{await projectLock(project.id,async()=>{const latest=await projectStore.load(project.id);if(!latest)throw new Error('Không tìm thấy project');latest.autoSync=value;delete latest.syncRetry;await projectStore.save(latest);});onMessage(value?'Đã bật đồng bộ tự động cho project đã gắn tài khoản':'Đã giữ bản local và tắt đồng bộ tự động');}
    catch(error){onMessage(error instanceof Error?error.message:'Không lưu được lựa chọn đồng bộ');}
    finally{setOptimisticAuto(undefined);setSettingsBusy(false);}
  }
  async function serverCopy(){
    if(!project.projectId||reading)return;setReading(true);
    try{
      const api=new ProjectApi(()=>session.accessToken()??''),me=await api.request('users/me');api.bindOwner(String(me._id));if(project.accountId&&project.accountId!==me._id)throw new Error('SYNC_ACCOUNT_MISMATCH');
      const detail=await api.request(`projects/${project.projectId}`),dataset=detail.dataset as {_id:string;currentVersionId:string};if(!dataset?._id)throw new Error('Project server không có dataset');
      const snapshot=await api.snapshot(dataset._id,dataset.currentVersionId);
      downloadFile(`${project.name}.server-snapshot.json`,JSON.stringify({format:'data-workspace-server-snapshot',schema:1,projectId:project.projectId,datasetId:dataset._id,versionId:dataset.currentVersionId,downloadedAt:new Date().toISOString(),snapshot},null,2),'application/json');onMessage('Đã tải bản server để đối chiếu; bản local được giữ nguyên');
    }catch(error){onMessage(error instanceof Error?error.message:'Không tải được bản server');}finally{setReading(false);}
  }
  return <section aria-label="Trung tâm đồng bộ"><h2>{project.name}</h2><p data-testid="sync-state">{status} · {cursor}/{total} thao tác xác nhận</p><progress aria-label="Tiến độ thao tác đồng bộ" max={Math.max(1,total)} value={cursor}/><p>{status==='synced'?'Server đã xác nhận mọi thao tác.':status==='syncing'?`Đang đồng bộ · ${phases[live?.phase??'']??'Kiểm tra tài khoản/nguồn/mapping'}`:`Còn ${total-cursor} thao tác xử lý và ${project.datasetId?0:1} lần import nguồn chưa xác nhận.`}</p>
    {error&&<p role="alert">{error} — {errors[error]??'Chưa xác nhận hoàn tất; bản local và khóa retry vẫn được giữ.'}</p>}
    {project.projectId&&<p>Project server: <span data-testid="server-project">{project.projectId}</span></p>}{project.datasetId&&<p>Dataset server: <span data-testid="server-dataset">{project.datasetId}</span></p>}
    <div className="toolbar"><Button disabled={busy||!authenticated} onClick={onSync}>Đồng bộ lên server</Button>{project.projectId&&<Button variant="secondary" disabled={busy||reading||!authenticated} onClick={()=>void serverCopy()}>Tải bản server để đối chiếu</Button>}</div>
    <label className="check"><input type="checkbox" checked={optimisticAuto??auto} disabled={busy||settingsBusy} onChange={event=>void automatic(event.target.checked)}/>Tự đồng bộ khi kết nối lại</label><p className="muted">Chỉ chạy sau lần đồng bộ thủ công đã gắn tài khoản. Luôn kiểm API/phiên, giữ khóa retry, chặn account/conflict/engine; tối đa 5 lần tự thử với thời gian chờ tăng dần.</p>
    {retry&&<p className="notice">Đã tự thử {retry.attempt}/5 lần. {retry.attempt>=5?'Đã dừng tự retry; kiểm kết nối và chọn Đồng bộ lên server để thử lại.':`Lần tiếp theo sau ${new Date(retry.nextAt).toLocaleTimeString('vi-VN')}.`}</p>}
    {(status==='conflict'||status==='blocked')&&auto&&<Button variant="secondary" disabled={busy} onClick={()=>void automatic(false)}>Giữ local và dừng tự đồng bộ</Button>}
    {stale&&<p className="notice">Bản local đã đổi ở tab khác; tải lại để đọc snapshot mới. <Button variant="secondary" disabled={busy} onClick={()=>void onReload()}>Tải lại bản local</Button></p>}
    {project.operations.length>0&&<details><summary>Hàng đợi và checkpoint · {cursor}/{total}</summary><ol start={(page-1)*20+1}>{project.operations.slice((page-1)*20,page*20).map((operation,index)=>{const position=(page-1)*20+index;const phase=position<cursor?'confirmed':position===cursor?live?.phase??operation.phase:operation.phase;return <li key={operation.id}>{operation.kind==='process'?operation.specification.method:'Khôi phục phiên bản'} · {phases[phase]??phase}{operation.resultVersionId?' · đã có phiên bản server':''}</li>;})}</ol>{total>20&&<div className="pagination"><Button variant="secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>Hàng đợi trước</Button><span>Trang {page}/{Math.ceil(total/20)}</span><Button variant="secondary" disabled={page*20>=total} onClick={()=>setPage(page+1)}>Hàng đợi sau</Button></div>}<p className="muted">Retry giữ nguyên khóa khi chưa rõ server đã commit. Xung đột/quyền/engine dừng để xem xét; không ghi đè server hay đổi tài khoản tự động.</p></details>}
  </section>;
}
