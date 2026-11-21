import { useCallback, useSyncExternalStore } from 'react';

const serverSnapshot = () => false;

export function useMediaQuery(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  const read = useCallback(() => matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}
