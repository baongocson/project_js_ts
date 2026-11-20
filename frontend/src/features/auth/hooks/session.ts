import { useEffect, useSyncExternalStore } from 'react';
import { session, subscribeSession } from '../services/session-service';
export { session } from '../services/session-service';

export function useSession() {
  return useSyncExternalStore(subscribeSession, session.getSnapshot);
}
export function SessionBootstrap() {
  useEffect(() => {
    void session.bootstrap();
    const reconnect = () => { if (session.getSnapshot().status !== 'authenticated') void session.bootstrap(); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  return null;
}
