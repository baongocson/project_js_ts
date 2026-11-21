import { useEffect,useState } from 'react';
import { useSession } from '../../features/auth';
import { readLocalAnalytics,type LocalAnalytics } from '../../features/offline';

export function useDashboardAnalytics(){
  const { user, status } = useSession();
  const owner = user?._id;
  const [result, setResult] = useState<{ owner?: string; data: LocalAnalytics | null }>();
  useEffect(() => {
    if (status === 'loading') return;
    let current = true;
    void readLocalAnalytics(owner).then(data => {
      if (current) setResult({ owner, data });
    }).catch(() => {
      if (current) setResult({ owner, data: null });
    });
    return () => { current = false; };
  }, [owner, status]);
  const data = status !== 'loading' && result?.owner === owner ? result?.data : undefined;
  return data;
}
