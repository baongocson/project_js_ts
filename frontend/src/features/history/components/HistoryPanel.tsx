import { useEffect,useRef,useState } from 'react';
import type { ProcessingSummary } from '@dashboard/data-core';
import { ApiError,requestJson } from '../../../shared/api';
import { Button,Dialog,Feedback } from '../../../shared/ui';
interface Operation {_id:string;kind:'import'|'process'|'restore';baseVersionId:string|null;resultVersionId:string;summary:ProcessingSummary;createdAt:string;specification:{method?:string;targetVersionId?:string}}
interface HistoryPage {items:Operation[];page:number;limit:number;total:number}
export function HistoryPanel({datasetId,currentVersionId,onRestored}:{datasetId:string;currentVersionId:string;onRestored():Promise<void>}){
  const [page,setPage]=useState(1),[kind,setKind]=useState(''),[data,setData]=useState<HistoryPage>(),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[target,setTarget]=useState<Operation>();
  const [refresh,setRefresh]=useState(0),[sent,setSent]=useState(false);
  const attempt=useRef<{target:string;key:string;sent:boolean}|undefined>(undefined),working=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();
    void requestJson<HistoryPage>(`datasets/${datasetId}/operations?page=${page}&limit=10${kind?`&kind=${kind}`:''}`,{signal:abort.signal}).then(value=>{setData(value);setError('');setLoading(false);}).catch(error=>{if(!abort.signal.aborted){setError(error instanceof Error?error.message:'Không tải được lịch sử');setLoading(false);}});
    return()=>abort.abort();
  },[datasetId,currentVersionId,page,kind,refresh]);
  function open(operation:Operation){setSent(false);attempt.current={target:operation.resultVersionId,key:crypto.randomUUID(),sent:false};setTarget(operation);setError('');}
  async function restore(){
    if(working.current||!target||!attempt.current)return;working.current=true;setBusy(true);setError('');attempt.current.sent=true;setSent(true);
    try{
      await requestJson(`datasets/${datasetId}/versions/${target.resultVersionId}/restore`,{method:'POST',json:{expectedCurrentVersionId:currentVersionId},headers:{'Idempotency-Key':attempt.current.key}});
      setTarget(undefined);attempt.current=undefined;setSent(false);await onRestored();
    }catch(error){if(error instanceof ApiError&&error.status>=400&&error.status<500&&!['IDEMPOTENCY_PENDING','REQUEST_IN_PROGRESS'].includes(error.code)&&attempt.current){attempt.current.sent=false;setSent(false);}setError(error instanceof Error?error.message:'Không khôi phục được phiên bản');}
    finally{working.current=false;setBusy(false);}
  }
  return <section role="region" aria-label="Lịch sử phiên bản"><div className="toolbar"><h2>Lịch sử phiên bản</h2><label htmlFor="history-kind">Loại thao tác</label><select id="history-kind" disabled={busy} value={kind} onChange={event=>{setLoading(true);setPage(1);setKind(event.target.value);}}><option value="">Tất cả</option><option value="import">Import</option><option value="process">Xử lý</option><option value="restore">Khôi phục</option></select><Button variant="secondary" onClick={()=>{setLoading(true);setRefresh(value=>value+1);}}>Tải lại lịch sử</Button></div>
    {error&&<Feedback error>{error}</Feedback>}{loading?<p>Đang tải lịch sử…</p>:!data?.items.length?<p>Chưa có thao tác phù hợp.</p>:<ol className="history-list">{data.items.map(item=><li key={item._id}><div><strong>{item.kind==='process'?item.specification.method:item.kind==='restore'?'Khôi phục phiên bản':'Import CSV'}</strong><p>{new Date(item.createdAt).toLocaleString('vi-VN')} · {item.summary.after.rowCount} dòng × {item.summary.after.columnCount} cột</p><p className="muted">+{item.summary.insertedRowCount}/−{item.summary.deletedRowCount} dòng · {item.summary.updatedCellCount} ô đổi giá trị · +{item.summary.addedColumnCount}/−{item.summary.removedColumnCount} cột</p><small>{item.resultVersionId}</small></div><Button variant="secondary" disabled={busy||item.resultVersionId===currentVersionId||sent} onClick={()=>open(item)}>{item.resultVersionId===currentVersionId?'Đang sử dụng':'Khôi phục phiên bản'}</Button></li>)}</ol>}
    {data&&<div className="pagination"><Button variant="secondary" disabled={loading||page<=1} onClick={()=>{setLoading(true);setPage(page-1);}}>Lịch sử trước</Button><span>Trang {page}/{Math.max(1,Math.ceil(data.total/10))} · {data.total} thao tác</span><Button variant="secondary" disabled={loading||page*10>=data.total} onClick={()=>{setLoading(true);setPage(page+1);}}>Lịch sử sau</Button></div>}
    {target&&<Dialog title="Khôi phục dữ liệu" busy={busy||sent} onClose={()=>{if(!busy&&!attempt.current?.sent){setTarget(undefined);attempt.current=undefined;}}}>
      <p>Khôi phục dữ liệu từ phiên bản {target?.resultVersionId} sẽ tạo một phiên bản mới và giữ nguyên lịch sử.</p>{error&&<Feedback error>{error}</Feedback>}
      <Button disabled={busy} onClick={()=>void restore()}>{busy?'Đang khôi phục…':sent?'Kiểm tra lại khôi phục':'Xác nhận khôi phục'}</Button>
    </Dialog>}
  </section>;
}
