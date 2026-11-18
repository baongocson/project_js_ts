import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { session, useSession } from './session';
import { type AccountSafetyProps } from '../types';

export type ProfileProps = AccountSafetyProps;
export function useProfile({ inspectLocal, withAccountLock }: AccountSafetyProps){
  const { user } = useSession();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

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

  return {inspectLocal,withAccountLock,user,navigate,displayName,setDisplayName,message,error,busy,save};
}
export type ProfileModel = ReturnType<typeof useProfile>;
