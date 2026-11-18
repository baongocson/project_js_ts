import { useProjectRecovery, type ProjectRecoveryProps } from '../hooks/useProjectRecovery';
import { useBackupImporter, type BackupImporterProps } from '../hooks/useBackupImporter';

import { ENGINE_VERSION } from '@dashboard/data-core';
import { Button, Dialog, Feedback } from '../../../shared/ui';

import { hasOriginalSource } from '../project-backup';

export function BackupImporter(props:BackupImporterProps){
  const {preview,error,busy,inspect,restore}=useBackupImporter(props);

return <section aria-label="Phục hồi backup" aria-busy={busy}><h2>Phục hồi project từ backup</h2><p>Backup giữ CSV, phiên bản, lịch sử và khóa retry. Chỉ thêm khi ID chưa tồn tại trên thiết bị; không ghi đè bản đang có và không tự đồng bộ lên server.</p><label>File backup project<input type="file" accept=".json,application/json" disabled={busy} onChange={event=>void inspect(event.target.files?.[0])}/></label>{busy&&<p aria-live="polite">Đang kiểm tra hoặc lưu backup…</p>}{preview&&<div className="notice"><strong>{preview.name}</strong><p>{preview.snapshot.rows.length} dòng · {preview.snapshot.columns.length} cột · {preview.operations.length} thao tác · {preview.cursor} đã xác nhận</p>{preview.accountId&&<p>Backup đã gắn tài khoản; cần đăng nhập đúng tài khoản để tiếp tục sync.</p>}{preview.engineVersion!==ENGINE_VERSION&&<p>Engine backup khác phiên bản ứng dụng. Giữ nguyên nhãn engine/lịch sử; sync sẽ dừng để bạn xem xét.</p>}<Button disabled={busy} onClick={()=>void restore()}>Phục hồi backup trên thiết bị</Button></div>}{error&&<Feedback error>{error}</Feedback>}</section>;
}
export function ProjectRecovery(props:ProjectRecoveryProps){
  const { project, busy, error, removing, setRemoving, confirmed, setConfirmed, action, exportBackup, downloadOriginalCsv, recoverSourceFile, removeLocalProject }=useProjectRecovery(props);

return <section aria-label="Sao lưu và nguồn CSV"><h2>Sao lưu và nguồn CSV</h2><p>Xuất backup trước khi dọn storage hoặc xử lý xung đột. Backup có thể chứa dữ liệu CSV cá nhân; giữ file ở nơi bạn kiểm soát.</p>{!hasOriginalSource(project)&&<p className="notice error">CSV nguồn đang thiếu. Snapshot và lịch sử vẫn mở được; chọn lại đúng file gốc để phục hồi nguồn trước khi import lên server.</p>}
    <div className="toolbar"><Button variant="secondary" disabled={busy} onClick={()=>void action(exportBackup)}>Xuất backup project</Button><Button variant="secondary" disabled={busy||!hasOriginalSource(project)} onClick={downloadOriginalCsv}>Tải CSV nguồn</Button><Button variant="danger" disabled={busy} onClick={()=>{setConfirmed(false);setRemoving(true);}}>Xóa project trên thiết bị</Button></div>
    <label>Khôi phục CSV nguồn<input type="file" accept=".csv,text/csv" disabled={busy} onChange={recoverSourceFile}/></label><small>Kiểm SHA-256 và typed snapshot ban đầu. File khác sẽ bị từ chối; không thay nguồn bằng CSV đã xử lý.</small>
    {error&&!removing&&<Feedback error>{error}</Feedback>}
    {removing&&<Dialog title="Xóa bản local?" busy={busy} onClose={()=>setRemoving(false)}><p>Xóa “{project.name}” khỏi thiết bị cùng CSV, snapshot, history, mapping, hàng đợi và cấu hình local. Dữ liệu trên server được giữ nguyên. Nếu còn thao tác chưa sync, hãy xuất backup trước.</p>{error&&<Feedback error>{error}</Feedback>}<Button variant="secondary" disabled={busy} onClick={()=>void action(exportBackup)}>Xuất backup trước khi xóa</Button><label className="check"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Tôi đã giữ backup cần thiết và đồng ý xóa bản local</label><Button variant="danger" disabled={busy||!confirmed} onClick={removeLocalProject}>Xác nhận xóa bản local</Button></Dialog>}
  </section>;
}
