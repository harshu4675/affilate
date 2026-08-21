import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { KEYS, loadAppState, parseStoredState, saveAppState } from '../services/storage.js';
import { normalizeUrlForCompare } from '../utils/url.js';
import { createId } from '../utils/id.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = loadAppState();
  const storeRef = useRef(initialRef.current);
  const [store, setStore] = useState(initialRef.current);
  const [persistenceError, setPersistenceError] = useState(null);

  const commit = useCallback((updater) => {
    const previous = storeRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (!next || next === previous) return { ok: true };
    const saved = saveAppState(next);
    if (!saved.ok) {
      setPersistenceError(saved);
      return saved;
    }
    storeRef.current = next;
    setStore(next);
    setPersistenceError(null);
    return saved;
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== KEYS.store || !event.newValue) return;
      const next = parseStoredState(event.newValue);
      if (!next) return;
      storeRef.current = next;
      setStore(next);
      setPersistenceError(null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const upsertProduct = useCallback(
    (product, options = {}) => {
      if (!product || !product.id) return { ok: false, code: 'invalid_product', message: 'The product record is invalid.' };
      return commit((previous) => {
        const index = previous.products.findIndex((item) => item.id === product.id);
        const products = [...previous.products];
        if (index === -1) products.unshift(product);
        else products[index] = product;
        return { ...previous, products, draft: options.clearDraft ? null : previous.draft };
      });
    },
    [commit]
  );

  const upsertProducts = useCallback(
    (records) => {
      if (!Array.isArray(records) || records.some((record) => !record || !record.id)) {
        return { ok: false, code: 'invalid_product', message: 'One or more product records are invalid.' };
      }
      return commit((previous) => {
        const byId = new Map(previous.products.map((item) => [item.id, item]));
        for (const record of records) byId.set(record.id, record);
        const added = records.filter((record) => !previous.products.some((item) => item.id === record.id));
        return {
          ...previous,
          products: [...added, ...previous.products.map((item) => byId.get(item.id))]
        };
      });
    },
    [commit]
  );

  const deleteProducts = useCallback(
    (ids) => {
      const idSet = new Set(ids);
      return commit((previous) => ({
        ...previous,
        products: previous.products.filter((item) => !idSet.has(item.id)),
        history: previous.history.map((entry) =>
          entry.productId && idSet.has(entry.productId) ? { ...entry, productId: null } : entry
        ),
        shortlist: (previous.shortlist || []).filter((id) => !idSet.has(id))
      }));
    },
    [commit]
  );

  const toggleShortlist = useCallback(
    (id) => {
      if (!id) return { ok: true };
      return commit((previous) => {
        const current = previous.shortlist || [];
        const shortlist = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current].slice(0, 200);
        return { ...previous, shortlist };
      });
    },
    [commit]
  );

  const setShortlist = useCallback(
    (ids) => {
      const list = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id).slice(0, 200) : [];
      return commit((previous) => ({ ...previous, shortlist: list }));
    },
    [commit]
  );

  const addHistory = useCallback(
    (entry) =>
      commit((previous) => ({
        ...previous,
        history: [{ id: entry.id || createId('hist'), ...entry }, ...previous.history].slice(0, 60)
      })),
    [commit]
  );

  const setDraft = useCallback(
    (value) => commit((previous) => ({ ...previous, draft: typeof value === 'function' ? value(previous.draft) : value })),
    [commit]
  );
  const clearDraft = useCallback(() => commit((previous) => (previous.draft ? { ...previous, draft: null } : previous)), [commit]);

  const findByUrl = useCallback(
    (url) => {
      const key = normalizeUrlForCompare(url);
      if (!key) return null;
      return (
        store.products.find((item) => {
          const source = item.source || {};
          return [source.url, source.finalUrl, source.originalUrl]
            .filter(Boolean)
            .some((candidate) => normalizeUrlForCompare(candidate) === key);
        }) || null
      );
    },
    [store.products]
  );

  const findDuplicate = useCallback(
    (product) => {
      if (!product) return null;
      const source = product.source || {};
      const byUrl = [source.url, source.finalUrl]
        .filter(Boolean)
        .map(findByUrl)
        .find((item) => item && item.id !== product.id);
      if (byUrl) return byUrl;
      if (product.productId && source.platform) {
        return (
          store.products.find(
            (item) =>
              item.id !== product.id &&
              item.productId &&
              item.productId.toLowerCase() === product.productId.toLowerCase() &&
              item.source &&
              item.source.platform === source.platform
          ) || null
        );
      }
      return null;
    },
    [findByUrl, store.products]
  );

  const value = useMemo(
    () => ({
      products: store.products,
      history: store.history,
      draft: store.draft,
      shortlist: store.shortlist || [],
      persistenceError,
      clearPersistenceError: () => setPersistenceError(null),
      setDraft,
      clearDraft,
      upsertProduct,
      upsertProducts,
      deleteProducts,
      toggleShortlist,
      setShortlist,
      addHistory,
      findByUrl,
      findDuplicate
    }),
    [
      store,
      persistenceError,
      setDraft,
      clearDraft,
      upsertProduct,
      upsertProducts,
      deleteProducts,
      toggleShortlist,
      setShortlist,
      addHistory,
      findByUrl,
      findDuplicate
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
