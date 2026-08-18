const TRACKING_PARAMS = new Set(
  [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'utm_cid',
    'fbclid',
    'gclid',
    'msclkid',
    'dclid',
    'gbraid',
    'wbraid',
    'twclid',
    'yclid',
    'igshid',
    'igsh',
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
    'hsa_cam',
    'hsa_grp',
    'hsa_mt',
    'hsa_src',
    'hsa_ad',
    'hsa_acc',
    'hsa_net',
    'hsa_kw',
    'hsa_tgt',
    'hsa_ver',
    'mkt_tok',
    'aff',
    'affid',
    'affiliate',
    'affiliate_id',
    'ascsubtag',
    'linkcode',
    'creative',
    'creativeasin',
    'camp',
    'cjevent',
    'cmpid',
    'esrc',
    'irclickid',
    'pp',
    'src',
    'ranmid',
    'raneaid',
    'ransiteid',
    'tag'
  ].map((key) => key.toLowerCase())
);

const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.in',
  'amazon.com.au',
  'amazon.com.br',
  'amazon.com.mx',
  'amazon.ae',
  'amazon.sa',
  'amazon.sg',
  'amazon.co.jp',
  'amazon.pl',
  'amazon.se',
  'amazon.com.tr',
  'amazon.eg',
  'amazon.cn'
];

export const AMAZON_SHORT_DOMAINS = ['amzn.in', 'amzn.to', 'a.co'];

export function isAmazonHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return AMAZON_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isAmazonShortHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return AMAZON_SHORT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function extractAmazonProductId(input) {
  let parsed;
  try {
    parsed = input instanceof URL ? input : new URL(String(input));
  } catch {
    return '';
  }
  if (!isAmazonHost(parsed.hostname)) return '';
  const path = decodeURIComponent(parsed.pathname);
  const patterns = [
    /\/(?:dp|gp\/product|gp\/aw\/d|product-reviews|exec\/obidos\/asin)\/([A-Z0-9]{10})(?:[/?]|$)/i,
    /\/([A-Z0-9]{10})(?:[/?]|$)/i
  ];
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  const queryAsin = parsed.searchParams.get('asin') || parsed.searchParams.get('ASIN');
  return /^[A-Z0-9]{10}$/i.test(queryAsin || '') ? queryAsin.toUpperCase() : '';
}

function removeTrackingParams(parsed) {
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      parsed.searchParams.delete(key);
    }
  }
}

export function canonicalizeAmazonUrl(input) {
  let parsed;
  try {
    parsed = input instanceof URL ? new URL(input.toString()) : new URL(String(input));
  } catch {
    return null;
  }
  if (!isAmazonHost(parsed.hostname)) return parsed;
  const productId = extractAmazonProductId(parsed);
  if (!productId) return parsed;
  parsed.pathname = `/dp/${productId}`;
  parsed.search = '';
  parsed.hash = '';
  return parsed;
}

export function normalizeUrl(input) {
  let value = String(input || '').trim();
  if (!value) return { ok: false, reason: 'empty' };
  if (value.length > 2048) return { ok: false, reason: 'too_long' };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
    return { ok: false, reason: 'protocol' };
  }
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'protocol' };
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || !host.includes('.')) return { ok: false, reason: 'host' };
  parsed.hostname = host;
  parsed.hash = '';
  removeTrackingParams(parsed);
  parsed.searchParams.sort();
  parsed = canonicalizeAmazonUrl(parsed) || parsed;
  return {
    ok: true,
    url: parsed.toString(),
    productId: extractAmazonProductId(parsed),
    shortUrl: isAmazonShortHost(parsed.hostname)
  };
}
