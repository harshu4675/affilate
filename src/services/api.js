const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function apiHealth({ timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('unavailable');
    const body = await response.json();
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractProduct(url, { timeoutMs = 25000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }
  try {
    const response = await fetch(`${API_BASE}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
      cache: 'no-store'
    });
    let body;
    try {
      body = await response.json();
    } catch {
      throw { code: 'network_error', message: 'The extraction service returned an invalid response.', retryable: true, status: response.status };
    }
    if (!response.ok || !body.ok) {
      const error = (body && body.error) || { code: 'http_error', message: `Extraction failed (${response.status}).`, retryable: response.status >= 500 };
      error.status = response.status;
      throw error;
    }
    if (!body.data || !body.data.product || !body.data.source || typeof body.data.product !== 'object') {
      throw { code: 'network_error', message: 'The extraction service returned an incomplete product response.', retryable: true, status: response.status };
    }
    return body.data;
  } catch (err) {
    if (err && err.code) throw err;
    if (err && err.name === 'AbortError') throw { code: 'timeout', message: 'The extraction request timed out.', retryable: true };
    throw { code: 'network_error', message: 'Could not reach the extraction service.', retryable: true };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
