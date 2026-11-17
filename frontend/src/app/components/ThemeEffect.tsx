import { useEffect } from 'react';
import { useSession, type Theme } from '../../features/auth';

export function ThemeEffect() {
  const { user } = useSession();
  useEffect(() => {
    let cleanup = () => {};
    const sync = () => {
    cleanup();
    let saved: string | null = null;
    try { saved = localStorage.getItem('fe-theme'); } catch { /* Optional preference. */ }
    const theme: Theme = user?.preferences.theme || (saved === 'light' || saved === 'dark' ? saved : 'system');
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply();
    try { localStorage.setItem('fe-theme', theme); } catch { /* Optional preference. */ }
    media.addEventListener('change', apply);
    cleanup = () => media.removeEventListener('change', apply);
    };
    sync();
    window.addEventListener('fe-theme-change', sync);
    window.addEventListener('storage', sync);
    return () => { cleanup(); window.removeEventListener('fe-theme-change', sync); window.removeEventListener('storage', sync); };
  }, [user?.preferences.theme]);
  return null;
}
