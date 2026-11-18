import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Feedback } from '../../../shared/ui';
import { session, useSession } from '../hooks/session';

import { AccountActions, type AccountSafetyProps } from '../components/AccountActions';

export function ProfilePage({ inspectLocal, withAccountLock }: AccountSafetyProps) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  if (!user) return null;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (working.current) return;
    const trimmed = displayName.trim();
    if (displayName && (!trimmed || [...trimmed].length > 100)) { setError('Tên cần dài 1–100 ký tự sau khi bỏ khoảng trắng đầu/cuối.'); return; }
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      // Theme is owned by the header ThemeSwitcher; sending it here would overwrite a newer choice made there.
      await session.patch({ displayName: trimmed || null });
      setMessage('Đã cập nhật hồ sơ trên server.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không lưu được hồ sơ.'); }
    finally { working.current = false; setBusy(false); }
  }
  return <main><h1>Hồ sơ tài khoản</h1><p className="muted">{user.email}</p>
    <form className="panel" onSubmit={event => { void save(event); }} aria-busy={busy}>
      <Field label="Tên hiển thị" value={displayName} onChange={event => setDisplayName(event.target.value)} disabled={busy} hint="Để trống để xóa tên hiển thị." />
      <Button disabled={busy}>Lưu hồ sơ</Button>
    </form>
    {message && <Feedback>{message}</Feedback>}{error && <Feedback error>{error}</Feedback>}
    <section><h2>Phiên và tài khoản</h2>
      <AccountActions inspectLocal={inspectLocal} withAccountLock={withAccountLock} disabled={busy} onComplete={async (_action, notice) => {
        await navigate('/login', { replace: true, state: { notice } });
      }}/>
    </section>
  </main>;
}
