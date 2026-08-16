const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchHtml(url, { timeoutMs = 12000, maxBytes = 4 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    const contentType = response.headers.get('content-type') || '';
    const length = Number(response.headers.get('content-length') || 0);
    if (length > maxBytes) return { error: 'too_large', status: response.status };
    if (response.status === 429) return { error: 'rate_limited', status: 429 };
    if (response.status === 403 || response.status === 451) return { error: 'blocked', status: response.status };
    if (response.status === 404) return { error: 'not_found', status: 404 };
    if (response.status >= 500) return { error: 'server_error', status: response.status };
    if (!response.ok) return { error: 'http_error', status: response.status };
    if (/^(image\/|video\/|audio\/|application\/pdf)/i.test(contentType)) {
      return { error: 'not_html', status: response.status };
    }
    const text = await response.text();
    if (text.length > maxBytes) return { error: 'too_large', status: response.status };
    return { html: text, finalUrl: response.url, status: response.status, contentType };
  } catch (err) {
    if (err && err.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, { timeoutMs = 8000, maxBytes = 3 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/json,text/plain,*/*'
      }
    });
    if (!response.ok) return { error: `http_error`, status: response.status };
    const text = await response.text();
    if (text.length > maxBytes) return { error: 'too_large', status: response.status };
    try {
      return { json: JSON.parse(text), status: response.status };
    } catch {
      return { error: 'invalid_json', status: response.status };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}
