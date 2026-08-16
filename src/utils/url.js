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
    for (const key of TRACKING_PARAMS) parsed.searchParams.delete(key);
    parsed.searchParams.sort();
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return `${parsed.protocol}//${host}${parsed.pathname}${parsed.search}`;
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
