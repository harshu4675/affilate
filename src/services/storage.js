export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    try {
      const trimmed = JSON.stringify(value).slice(0, 4 * 1024 * 1024);
      localStorage.setItem(key, trimmed);
    } catch {
      return false;
    }
  }
  return true;
}

export const KEYS = {
  products: 'affilate:products:v1',
  history: 'affilate:history:v1',
  draft: 'affilate:draft:v1'
};
