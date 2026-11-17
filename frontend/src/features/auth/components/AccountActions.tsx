import { useRef, useState } from 'react';
import { Button, Dialog, Feedback, Field } from '../../../shared/ui';
import { session, useSession } from '../hooks/session';

export interface LocalAccountSafety {
  pendingCount: number;
  localProjectCount: number;
  workspaceDraftCount?: number;
  removeLocal(): Promise<void>;
}
export interface AccountSafetyProps {
  inspectLocal(userId: string): Promise<LocalAccountSafety>;
  withAccountLock(userId: string, work: () => Promise<void>): Promise<void>;
}
type AccountAction = 'logout' | 'delete';
export function AccountActions({ inspectLocal, withAccountLock, onComplete, deleteLabel = 'Xóa tài khoản', disabled = false }: AccountSafetyProps & {
  onComplete(action: AccountAction, message: string): void | Promise<void>;
  deleteLabel?: string;
  disabled?: boolean;
}) {
  const { user, status } = useSession();
  const working = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [prepared, setPrepared] = useState<{ action: AccountAction; userId: string; email: string; safety: LocalAccountSafety }>();
  const [remove, setRemove] = useState(false), [retain, setRetain] = useState(false), [confirmation, setConfirmation] = useState('');
  const hasLocal = (safety: LocalAccountSafety) => safety.localProjectCount > 0 || (safety.workspaceDraftCount ?? 0) > 0;

  async function prepare(action: AccountAction) {
    if (!user || working.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      const safety = await inspectLocal(user._id);
      if (session.getSnapshot().user?._id !== user._id) throw new Error('Tài khoản đã thay đổi. Vui lòng kiểm tra lại.');
      setRemove(false); setRetain(false); setConfirmation(''); setPrepared({ action, userId: user._id, email: user.email, safety });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không kiểm tra được dữ liệu trên máy.'); }
    finally { working.current = false; setBusy(false); }
  }
  async function confirm() {
    if (!prepared || working.current) return;
    const { action, userId } = prepared;
    working.current = true; setBusy(true); setError('');
    let remoteDeleted = false, endingSession = false;
    try {
      await withAccountLock(userId, async () => {
        if (session.getSnapshot().user?._id !== userId) throw new Error('Tài khoản đã thay đổi. Hủy và kiểm tra lại trước khi tiếp tục.');
        const latest = await inspectLocal(userId);
        if (session.getSnapshot().user?._id !== userId) throw new Error('Tài khoản đã thay đổi. Hủy và kiểm tra lại trước khi tiếp tục.');
        setPrepared({ ...prepared, safety: latest });
        if (action === 'delete' && (confirmation !== 'XÓA' || hasLocal(latest) && !remove && !retain))
          throw new Error('Nhập XÓA và xác nhận giữ hoặc xóa dữ liệu trên máy trước khi tiếp tục.');
        if (action === 'delete') {
          await session.deleteAccount(); remoteDeleted = true;
          if (remove) await latest.removeLocal();
        } else {
          if (remove) await latest.removeLocal();
          if (session.getSnapshot().user?._id !== userId) throw new Error('Tài khoản đã thay đổi; chưa đăng xuất tài khoản mới.');
          endingSession = true;
          await session.logout(!navigator.onLine);
        }
      });
      setPrepared(undefined);
      await onComplete(action, action === 'delete'
        ? `Đã xóa tài khoản server; ${remove ? 'đã xóa dữ liệu trên máy của tài khoản này.' : 'bản local được giữ, không thể đồng bộ về tài khoản đã xóa.'}`
        : navigator.onLine ? 'Đã đăng xuất; dữ liệu local giữ lại vẫn thuộc tài khoản này.' : 'Đã đăng xuất trên thiết bị; phiên server chưa được thu hồi.');
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : 'Không hoàn tất được yêu cầu.';
      if (remoteDeleted || endingSession && session.getSnapshot().status === 'anonymous') {
        setPrepared(undefined);
        await onComplete(action, remoteDeleted ? `Tài khoản đã xóa trên server nhưng chưa dọn xong dữ liệu trên máy. ${reason}`
          : `Đã kết thúc phiên trên thiết bị; chưa xác nhận thu hồi phiên server. ${reason}`);
      } else setError(reason);
    } finally { working.current = false; setBusy(false); }
  }
  return <>
    <div className="actions">
      {!user && status === 'offline' && <Button variant="secondary" disabled={disabled || busy} onClick={() => {
        void session.logout(true).then(() => onComplete('logout', 'Đã đăng xuất trên thiết bị; phiên server chưa được thu hồi. Dữ liệu local được giữ nguyên.'));
      }}>Đăng xuất trên thiết bị</Button>}
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
