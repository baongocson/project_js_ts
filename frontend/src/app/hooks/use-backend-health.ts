import { useEffect, useState } from 'react';
import { getHealth } from '../../shared';

export function useBackendHealth(): string {
  const [status, setStatus] = useState('Đang kiểm tra…');

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setStatus(`Đã kết nối · MongoDB: ${data.database}`);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : 'Chưa kết nối API');
        }
      });
    return () => controller.abort();
  }, []);

  return status;
}
