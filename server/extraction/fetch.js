const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const HTML_HEADERS = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'upgrade-insecure-requests': '1'
};

async function fetchFollowingRedirects(url, options, { maxRedirects, onRedirect }) {
  let currentUrl = url;
  const redirects = [];
  for (let count = 0; count <= maxRedirects; count += 1) {
    const response = await fetch(currentUrl, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, redirects, finalUrl: currentUrl };
    const location = response.headers.get('location');
    if (!location) return { response, redirects, finalUrl: currentUrl };
    if (count === maxRedirects) return { error: 'too_many_redirects', status: response.status, redirects };
    let nextUrl;
    try {
      nextUrl = new URL(location, currentUrl).toString();
    } catch {
      return { error: 'invalid_redirect', status: response.status, redirects };
    }
    if (onRedirect) {
      const allowed = await onRedirect(nextUrl);
      if (!allowed) return { error: 'blocked_redirect', status: response.status, redirects };
    }
    redirects.push({ status: response.status, from: currentUrl, to: nextUrl });
    currentUrl = nextUrl;
  }
  return { error: 'too_many_redirects', redirects };
}

export async function fetchHtml(
  url,
  { timeoutMs = 15000, maxBytes = 5 * 1024 * 1024, maxRedirects = 6, onRedirect } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetchFollowingRedirects(
      url,
      {
        signal: controller.signal,
        headers: HTML_HEADERS
      },
      { maxRedirects, onRedirect }
    );
    if (result.error) return result;
    const { response, redirects } = result;
    const contentType = response.headers.get('content-type') || '';
    const length = Number(response.headers.get('content-length') || 0);
    const base = { status: response.status, finalUrl: response.url || result.finalUrl, contentType, redirects };
    if (length > maxBytes) return { ...base, error: 'too_large' };
    if (response.status === 429) return { ...base, error: 'rate_limited' };
    if (response.status === 401 || response.status === 403 || response.status === 451) return { ...base, error: 'blocked' };
    if (response.status === 404 || response.status === 410) return { ...base, error: 'not_found' };
    if (response.status >= 500) return { ...base, error: 'server_error' };
    if (!response.ok) return { ...base, error: 'http_error' };
    if (/^(image\/|video\/|audio\/|application\/pdf)/i.test(contentType)) {
      return { ...base, error: 'not_html' };
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) return { ...base, error: 'too_large' };
    return { ...base, html: text };
  } catch (err) {
    if (err && err.name === 'AbortError') return { error: 'timeout', status: 0, redirects: [] };
    return { error: 'network_error', status: 0, redirects: [], reason: err && err.message ? err.message : '' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(
  url,
  { timeoutMs = 10000, maxBytes = 3 * 1024 * 1024, maxRedirects = 4, onRedirect } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetchFollowingRedirects(
      url,
      {
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/json,text/plain,*/*',
          'cache-control': 'no-cache'
        }
      },
      { maxRedirects, onRedirect }
    );
    if (result.error) return result;
    const { response, redirects } = result;
    const base = { status: response.status, finalUrl: response.url || result.finalUrl, redirects };
    const length = Number(response.headers.get('content-length') || 0);
    if (length > maxBytes) return { ...base, error: 'too_large' };
    if (response.status === 429) return { ...base, error: 'rate_limited' };
    if (response.status === 401 || response.status === 403 || response.status === 451) return { ...base, error: 'blocked' };
    if (response.status === 404 || response.status === 410) return { ...base, error: 'not_found' };
    if (response.status >= 500) return { ...base, error: 'server_error' };
    if (!response.ok) return { ...base, error: 'http_error' };
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) return { ...base, error: 'too_large' };
    try {
      return { ...base, json: JSON.parse(text) };
    } catch {
      return { ...base, error: 'invalid_json' };
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return { error: 'timeout', status: 0, redirects: [] };
    return { error: 'network_error', status: 0, redirects: [], reason: err && err.message ? err.message : '' };
  } finally {
    clearTimeout(timer);
  }
}
