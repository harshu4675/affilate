import { useCallback, useEffect, useState } from 'react';
import { adminProducts } from '../services/catalogApi.js';

export function useAdminCatalog() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [storage, setStorage] = useState({ writable: true });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'));
    try {
      const data = await adminProducts();
      setProducts(data.products || []);
      setStats(data.stats || null);
      setStorage(data.storage || { writable: true });
      setError('');
      setStatus('ready');
    } catch (err) {
      setError((err && err.message) || 'The catalog could not be loaded.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { products, stats, storage, status, error, reload, setProducts };
}
