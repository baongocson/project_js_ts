import { useAccountActions, type AccountActionsProps } from '../hooks/useAccountActions';

import { Button, Dialog, Feedback, Field } from '../../../shared/ui';

export function AccountActions(props:AccountActionsProps){
  const { deleteLabel, disabled, user, status, busy, error, prepared, setPrepared, remove, setRemove, retain, setRetain, confirmation, setConfirmation, hasLocal, prepare, confirm, logoutLocally }=useAccountActions(props);

return <>
    <div className="actions">
      {!user && status === 'offline' && <Button variant="secondary" disabled={disabled || busy} onClick={logoutLocally}>Đăng xuất trên thiết bị</Button>}
      <Button variant="secondary" disabled={disabled || busy || !user} onClick={() => void prepare('logout')}>Đăng xuất</Button>
      <Button variant="danger" disabled={disabled || busy || !user || !navigator.onLine} onClick={() => void prepare('delete')}>{deleteLabel}</Button>
    </div>
    {error && !prepared && <Feedback error>{error}</Feedback>}
    {prepared && <Dialog title={prepared.action === 'delete' ? 'Xóa vĩnh viễn tài khoản?' : 'Đăng xuất?'} busy={busy} onClose={() => setPrepared(undefined)}>
      <p>Tài khoản: {prepared.email}</p>
      <p>Có {prepared.safety.localProjectCount} project trên máy và {prepared.safety.pendingCount} thao tác chưa đồng bộ.</p>
      {!!prepared.safety.workspaceDraftCount && <p>Còn {prepared.safety.workspaceDraftCount} bản nháp workspace trên máy. Hãy kiểm tra hoặc xuất bản nháp trước khi xóa.</p>}
      <p>{prepared.action === 'delete' ? 'Dữ liệu server sẽ bị xóa vĩnh viễn. Hủy để đồng bộ hoặc xuất backup trước khi tiếp tục.' : 'Bản local giữ lại vẫn thuộc tài khoản này; đồng bộ cần đăng nhập đúng tài khoản.'}</p>
      <label className="check"><input type="checkbox" disabled={busy} checked={remove} onChange={event => setRemove(event.target.checked)}/>Xóa cả dữ liệu trên máy của tài khoản này</label>
      {remove && hasLocal(prepared.safety) && <Feedback error>CSV, dữ liệu local và bản nháp của tài khoản này sẽ bị xóa khi xác nhận. Hãy xuất backup cần thiết trước.</Feedback>}
      {prepared.action === 'delete' && <>
        {!remove && hasLocal(prepared.safety) && <label className="check"><input type="checkbox" disabled={busy} checked={retain} onChange={event => setRetain(event.target.checked)}/>Tôi hiểu bản local và bản nháp giữ lại không thể đồng bộ về tài khoản đã xóa</label>}
        <Field label="Nhập XÓA để xác nhận" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)}/>
      </>}
      {error && <Feedback error>{error}</Feedback>}
      <Button variant={prepared.action === 'delete' ? 'danger' : 'primary'} disabled={busy || prepared.action === 'delete' && (confirmation !== 'XÓA' || hasLocal(prepared.safety) && !remove && !retain)} onClick={() => void confirm()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button>
    </Dialog>}
  </>;
}

export type {LocalAccountSafety,AccountSafetyProps} from '../types';
