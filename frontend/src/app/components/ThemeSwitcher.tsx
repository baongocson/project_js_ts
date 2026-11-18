import { useEffect, useState } from 'react';
import { session, useSession, type Theme } from '../../features/auth';

function storedTheme():Theme {
    try { const value = localStorage.getItem('fe-theme'); return value === 'dark' || value === 'light' ? value : 'system'; }
    catch { return 'system'; }
}
export function ThemeSwitcher() {
  const { user } = useSession();
  const [local, setLocal] = useState<Theme>(storedTheme);
  useEffect(()=>{
    const sync=()=>setLocal(storedTheme());
    window.addEventListener('storage',sync);window.addEventListener('fe-theme-change',sync);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('fe-theme-change',sync);};
  },[]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function change(theme: Theme) {
    setBusy(true); setError('');
    try {
      if (user) await session.patch({ preferences: { theme } });
      else {
        localStorage.setItem('fe-theme', theme);
        setLocal(theme);
        window.dispatchEvent(new Event('fe-theme-change'));
      }
    } catch { setError('Không lưu được giao diện. Hãy thử lại.'); }
    finally { setBusy(false); }
  }
  return <div className="shell-theme"><label htmlFor="shell-theme">Giao diện</label>
    <select id="shell-theme" value={user?.preferences.theme ?? local} disabled={busy} onChange={event => void change(event.target.value as Theme)}>
      <option value="system">Theo hệ thống</option><option value="light">Sáng</option><option value="dark">Tối</option>
    </select>{error && <small role="alert">{error}</small>}</div>;
}
