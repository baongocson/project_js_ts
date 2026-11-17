import { useEffect } from 'react';
import { useSession, type Theme } from '../../features/auth';

export function ThemeEffect() {
  const { user } = useSession();
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('fe-theme'); } catch { /* Optional preference. */ }
    const theme: Theme = user?.preferences.theme || (saved === 'light' || saved === 'dark' ? saved : 'system');
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply();
    try { localStorage.setItem('fe-theme', theme); } catch { /* Optional preference. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [user?.preferences.theme]);
  return null;
}
