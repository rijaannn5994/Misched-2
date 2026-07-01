import { useEffect, useRef } from 'react';

export function useNotificationSSE(onNew) {
  const cbRef = useRef(onNew);
  cbRef.current = onNew;

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    let es;
    let timer;
    let dead = false;
    let retries = 0;
    const MAX_RETRIES = 5;

    const connect = () => {
      if (dead) return;
      es = new EventSource(`/api/sse/notifications?token=${encodeURIComponent(token)}`);

      es.onmessage = (e) => {
        retries = 0; // reset on successful message
        try {
          const data = JSON.parse(e.data);
          cbRef.current(data);
        } catch (_) {}
      };

      es.onerror = () => {
        es.close();
        retries += 1;
        // Stop retrying on auth failure or after too many attempts
        if (dead || retries > MAX_RETRIES) return;
        const delay = Math.min(3000 * retries, 30000);
        timer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      dead = true;
      clearTimeout(timer);
      if (es) es.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
