import { normalizeImageUrl } from './imageService.js';

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

function imageKey(url) {
  return String(url || '')
    .replace(/^https?:/i, 'http:')
    .toLowerCase();
}

/**
 * Repair legacy image data for one product:
 *  - re-map platform size-variant URLs (e.g. Amazon `._SL500_.jpg`) to the
 *    highest-quality original source,
 *  - collapse duplicate copies of the same photo to a single entry
 *    (keeping the earliest position; a primary flag moves to the kept copy),
 *  - drop "removed" entries whose photo is already in the gallery.
 * Returns the original object untouched when nothing needed fixing.
 */
export function sanitizeProductImages(product) {
  if (!product || typeof product !== 'object') return product;
  const platform = product.source && product.source.platform;
  const images = Array.isArray(product.images) ? product.images : [];
  const removedImages = Array.isArray(product.removedImages) ? product.removedImages : [];
  if (images.length === 0 && removedImages.length === 0) return product;

  let changed = false;
  const canonicalize = (list, dedupe = true) => {
    const out = [];
    const seen = new Map();
    for (const image of list) {
      if (!image || typeof image !== 'object') continue;
      let url = image.url;
      let nextUrl = url;
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        nextUrl = normalizeImageUrl(url, platform);
      }
      if (nextUrl !== url) changed = true;
      const key = typeof nextUrl === 'string' && /^https?:\/\//i.test(nextUrl) ? imageKey(nextUrl) : '';
      if (dedupe && key && seen.has(key)) {
        changed = true;
        const kept = out[seen.get(key)];
        if (image.isPrimary && !kept.isPrimary) {
          kept.isPrimary = true;
        }
        continue;
      }
      const copy = nextUrl === url ? { ...image } : { ...image, url: nextUrl };
      if (dedupe && key) seen.set(key, out.length);
      out.push(copy);
    }
    return out.map((image, index) => (image.position === index ? image : { ...image, position: index }));
  };

  const nextImages = canonicalize(images);
  const liveKeys = new Set(nextImages.map((image) => imageKey(image.url)).filter(Boolean));
  const nextRemoved = canonicalize(removedImages).filter((image) => {
    const key = imageKey(image.url);
    if (key && liveKeys.has(key)) {
      changed = true;
      return false;
    }
    return true;
  });

  if (nextImages.length !== images.length || nextRemoved.length !== removedImages.length) changed = true;

  if (!changed) return product;
  const next = { ...product, images: nextImages, removedImages: nextRemoved };
  // Star repair: every gallery needs exactly one primary image.
  if (nextImages.length > 0 && !nextImages.some((image) => image.isPrimary)) {
    next.images = nextImages.map((image, index) => (index === 0 ? { ...image, isPrimary: true } : image));
  }
  return next;
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const products = Array.isArray(source.products) ? source.products.filter((item) => item && typeof item === 'object' && item.id) : [];
  const migrated = { value: false };
  const normalizedProducts = products.map((product) => {
    const next = sanitizeProductImages(product);
    if (next !== product) migrated.value = true;
    return next;
  });
  const state = {
    products: normalizedProducts,
    history: Array.isArray(source.history) ? source.history.filter((item) => item && typeof item === 'object').slice(0, 60) : [],
    draft: source.draft && typeof source.draft === 'object' ? source.draft : null,
    shortlist: Array.isArray(source.shortlist) ? source.shortlist.filter((id) => typeof id === 'string' && id).slice(0, 200) : []
  };
  if (migrated.value) state._imagesMigrated = true;
  return state;
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
  if (current && current.version === STORE_VERSION && current.data) {
    const state = normalizeState(current.data);
    if (state._imagesMigrated) {
      // Persist the one-time image repair so legacy products are fixed.
      saveAppState(state);
    }
    return state;
  }
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
