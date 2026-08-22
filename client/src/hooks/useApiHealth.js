import { useEffect, useState } from 'react';
import { apiHealth } from '../services/api.js';

export function useApiHealth(intervalMs = 30000) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await apiHealth();
        if (active) setStatus('online');
      } catch {
        if (active) setStatus('offline');
      }
    };
    check();
    const timer = setInterval(check, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return status;
}
