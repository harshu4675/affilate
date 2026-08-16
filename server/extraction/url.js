const TRACKING_PARAMS = [
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
  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) return { ok: false, reason: 'host' };
  for (const key of TRACKING_PARAMS) parsed.searchParams.delete(key);
  parsed.hash = '';
  return { ok: true, url: parsed.toString() };
}
