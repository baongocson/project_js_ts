import type { HistoryModel } from '../hooks/useHistory';

import { Button, Dialog, Feedback } from '../../../shared/ui';
export function HistoryPanel(model:HistoryModel){
  const { currentVersionId, page, setPage, kind, setKind, data, error, loading, setLoading, busy, target, setRefresh, sent, open, restore, closeRestore }=model;

return <section role="region" aria-label="Lịch sử phiên bản"><div className="toolbar"><h2>Lịch sử phiên bản</h2><label htmlFor="history-kind">Loại thao tác</label><select id="history-kind" disabled={busy} value={kind} onChange={event=>{setLoading(true);setPage(1);setKind(event.target.value);}}><option value="">Tất cả</option><option value="import">Import</option><option value="process">Xử lý</option><option value="restore">Khôi phục</option></select><Button variant="secondary" onClick={()=>{setLoading(true);setRefresh(value=>value+1);}}>Tải lại lịch sử</Button></div>
    {error&&<Feedback error>{error}</Feedback>}{loading?<div className="loading-panel" aria-live="polite">Đang tải lịch sử…<span className="skeleton-line" aria-hidden="true"/></div>:!data?.items.length?<p>Chưa có thao tác phù hợp.</p>:<ol className="history-list">{data.items.map(item=><li key={item._id}><div><strong>{item.kind==='process'?item.specification.method:item.kind==='restore'?'Khôi phục phiên bản':'Import CSV'}</strong><p>{new Date(item.createdAt).toLocaleString('vi-VN')} · {item.summary.after.rowCount} dòng × {item.summary.after.columnCount} cột</p><p className="muted">+{item.summary.insertedRowCount}/−{item.summary.deletedRowCount} dòng · {item.summary.updatedCellCount} ô đổi giá trị · +{item.summary.addedColumnCount}/−{item.summary.removedColumnCount} cột</p><small>{item.resultVersionId}</small></div><Button variant="secondary" disabled={busy||item.resultVersionId===currentVersionId||sent} onClick={()=>open(item)}>{item.resultVersionId===currentVersionId?'Đang sử dụng':'Khôi phục phiên bản'}</Button></li>)}</ol>}
    {data&&<div className="pagination"><Button variant="secondary" disabled={loading||page<=1} onClick={()=>{setLoading(true);setPage(page-1);}}>Lịch sử trước</Button><span>Trang {page}/{Math.max(1,Math.ceil(data.total/10))} · {data.total} thao tác</span><Button variant="secondary" disabled={loading||page*10>=data.total} onClick={()=>{setLoading(true);setPage(page+1);}}>Lịch sử sau</Button></div>}
    {target&&<Dialog title="Khôi phục dữ liệu" busy={busy||sent} onClose={closeRestore}>
      <p>Khôi phục dữ liệu từ phiên bản {target?.resultVersionId} sẽ tạo một phiên bản mới và giữ nguyên lịch sử.</p>{error&&<Feedback error>{error}</Feedback>}
      <Button disabled={busy} onClick={()=>void restore()}>{busy?'Đang khôi phục…':sent?'Kiểm tra lại khôi phục':'Xác nhận khôi phục'}</Button>
    </Dialog>}
  </section>;
}
