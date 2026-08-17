const STORE_KEY = 'affilate:store:v2';
const STORE_VERSION = 2;

export const KEYS = {
  store: STORE_KEY,
  products: 'affilate:products:v1',
  history: 'affilate:history:v1',
  draft: 'affilate:draft:v1'
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    products: Array.isArray(source.products) ? source.products.filter((item) => item && typeof item === 'object' && item.id) : [],
    history: Array.isArray(source.history) ? source.history.filter((item) => item && typeof item === 'object').slice(0, 60) : [],
    draft: source.draft && typeof source.draft === 'object' ? source.draft : null
  };
}

export function parseStoredState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORE_VERSION || !parsed.data) return null;
    return normalizeState(parsed.data);
  } catch {
    return null;
  }
}

export function loadAppState() {
  const current = readJson(STORE_KEY, null);
  if (current && current.version === STORE_VERSION && current.data) return normalizeState(current.data);
  const migrated = normalizeState({
    products: readJson(KEYS.products, []),
    history: readJson(KEYS.history, []),
    draft: readJson(KEYS.draft, null)
  });
  saveAppState(migrated);
  return migrated;
}

export function saveAppState(state) {
  try {
    const payload = JSON.stringify({
      version: STORE_VERSION,
      updatedAt: new Date().toISOString(),
      data: normalizeState(state)
    });
    localStorage.setItem(STORE_KEY, payload);
    return { ok: true, bytes: new TextEncoder().encode(payload).length };
  } catch (error) {
    const quota = error && (error.name === 'QuotaExceededError' || error.code === 22);
    return {
      ok: false,
      code: quota ? 'quota_exceeded' : 'storage_unavailable',
      message: quota
        ? 'Browser storage is full. Remove large uploaded images or export and delete unused products.'
        : 'Browser storage is unavailable. Your changes could not be saved.'
    };
  }
}

export function loadJson(key, fallback) {
  return readJson(key, fallback);
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
