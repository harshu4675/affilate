const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, { method = 'GET', body, signal, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || !payload || payload.ok !== true) {
      const error = (payload && payload.error) || {
        code: 'http_error',
        message: `Request failed (${response.status}).`
      };
      error.status = response.status;
      throw error;
    }
    return payload.data;
  } catch (err) {
    if (err && err.code) throw err;
    if (err && err.name === 'AbortError') throw { code: 'timeout', message: 'The request timed out.' };
    throw { code: 'network_error', message: 'Could not reach the server. Check your connection.' };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === '' || value == null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------------------------------------------ public */

export function fetchStoreProducts(params, options) {
  return request(`/products${queryString(params)}`, options);
}

export function fetchStoreProduct(id, options) {
  return request(`/products/${encodeURIComponent(id)}`, options);
}

export function fetchPurchaseLink(id, options) {
  return request(`/products/${encodeURIComponent(id)}/go`, options);
}

/* ------------------------------------------------------------------- admin */

export function adminSession(options) {
  return request('/admin/session', options);
}

export function adminLogin(username, password) {
  return request('/admin/login', { method: 'POST', body: { username, password } });
}

export function adminLogout() {
  return request('/admin/logout', { method: 'POST' });
}

export function adminProducts(options) {
  return request('/admin/products', options);
}

export function adminPublish(products, { mode = 'merge', force = false } = {}) {
  return request('/admin/publish', { method: 'POST', body: { products, mode, force }, timeoutMs: 45000 });
}

export function adminUpdateProduct(id, patch) {
  return request(`/admin/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
}

export function adminDeleteProduct(id) {
  return request(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function adminBulk(action, ids) {
  return request('/admin/products/bulk', { method: 'POST', body: { action, ids } });
}
