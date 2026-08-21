const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_',
  'ref_src',
  'spm',
  'scm',
  'sprefix',
  'si',
  'srsltid',
  'wickedid',
  'li_fat_id',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'aff',
  'affid',
  'cjevent',
  'cmpid',
  'esrc',
  'irclickid',
  'pp',
  'src',
  'ranMID',
  'ranEAID',
  'ranSiteID',
  'tag'
];

export function normalizeUrlForCompare(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.some((entry) => entry.toLowerCase() === lower) || lower.startsWith('utm_')) parsed.searchParams.delete(key);
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    const amazonHost = /(^|\.)amazon\.(com|ca|co\.uk|de|fr|it|es|nl|in|com\.au|com\.br|com\.mx|ae|sa|sg|co\.jp|pl|se|com\.tr|eg)$/.test(host);
    if (amazonHost) {
      const match = decodeURIComponent(parsed.pathname).match(/\/(?:dp|gp\/product|gp\/aw\/d|product-reviews|exec\/obidos\/asin)\/([a-z0-9]{10})(?:[/?]|$)/i);
      if (match) return `https://${host}/dp/${match[1].toUpperCase()}`;
    }
    parsed.searchParams.sort();
    const pathname = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, '') : parsed.pathname;
    return `${parsed.protocol.toLowerCase()}//${host}${parsed.port ? `:${parsed.port}` : ''}${pathname}${parsed.search}`;
  } catch {
    return String(url).trim().toLowerCase();
  }
}

export function safeExternalHref(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function displayUrl(url, maxLength = 48) {
  if (!url) return '';
  const cleaned = String(url).replace(/^https?:\/\//, '');
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1)}...`;
}

/**
 * Resolve the outbound affiliate/store link for a library product.
 * Same priority the storefront uses: explicit affiliate URL -> original
 * (tracked) source URL -> clean source URL -> final URL. Returns '' when
 * there is no safe http(s) link — never invents one.
 */
export function resolvePurchaseHref(product) {
  if (!product || typeof product !== 'object') return '';
  const source = product.source && typeof product.source === 'object' ? product.source : {};
  const candidates = [product.affiliateUrl, source.originalUrl, source.url, source.finalUrl];
  for (const candidate of candidates) {
    const safe = safeExternalHref(candidate);
    if (safe) return safe;
  }
  return '';
}
