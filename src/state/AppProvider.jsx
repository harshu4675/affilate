import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadJson, saveJson, KEYS } from '../services/storage.js';
import { normalizeUrlForCompare } from '../utils/url.js';
import { createId } from '../utils/id.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [products, setProducts] = useState(() => loadJson(KEYS.products, []));
  const [history, setHistory] = useState(() => loadJson(KEYS.history, []));
  const [draft, setDraftState] = useState(() => loadJson(KEYS.draft, null));

  useEffect(() => {
    const timer = setTimeout(() => saveJson(KEYS.products, products), 250);
    return () => clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    const timer = setTimeout(() => saveJson(KEYS.history, history), 250);
    return () => clearTimeout(timer);
  }, [history]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft) saveJson(KEYS.draft, draft);
      else saveJson(KEYS.draft, null);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);

  const upsertProduct = useCallback((product) => {
    setProducts((prev) => {
      const index = prev.findIndex((item) => item.id === product.id);
      if (index === -1) return [product, ...prev];
      const next = [...prev];
      next[index] = product;
      return next;
    });
  }, []);

  const deleteProducts = useCallback((ids) => {
    const set = new Set(ids);
    setProducts((prev) => prev.filter((item) => !set.has(item.id)));
  }, []);

  const addHistory = useCallback((entry) => {
    setHistory((prev) => [{ id: entry.id || createId('hist'), ...entry }, ...prev].slice(0, 60));
  }, []);

  const setDraft = useCallback((value) => setDraftState(value), []);
  const clearDraft = useCallback(() => setDraftState(null), []);

  const findByUrl = useCallback(
    (url) => {
      const key = normalizeUrlForCompare(url);
      if (!key) return null;
      return products.find((item) => item.source && item.source.url && normalizeUrlForCompare(item.source.url) === key) || null;
    },
    [products]
  );

  const value = useMemo(
    () => ({
      products,
      history,
      draft,
      setDraft,
      clearDraft,
      upsertProduct,
      deleteProducts,
      addHistory,
      findByUrl
    }),
    [products, history, draft, setDraft, clearDraft, upsertProduct, deleteProducts, addHistory, findByUrl]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
