import { getPlatform } from '../constants/platforms.js';

export function detectPlatformFromUrl(input) {
  const value = String(input || '').trim();
  if (!value) return { id: 'unknown', label: 'Unknown', domain: '', matched: false };
  let host = '';
  try {
    host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return { id: 'unknown', label: 'Unknown', domain: '', matched: false };
  }
  for (const platform of ['amazon', 'ebay', 'walmart', 'etsy', 'aliexpress']) {
    const entry = getPlatform(platform);
    if (entry.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return { id: entry.id, label: entry.label, domain: host, matched: true };
    }
  }
  try {
    const path = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).pathname;
    if (/^\/products\/[^/?#]+/.test(path)) {
      return { id: 'shopify', label: 'Shopify store', domain: host, matched: true };
    }
  } catch {
    return { id: 'unknown', label: 'Unknown', domain: host, matched: false };
  }
  return { id: 'generic', label: 'Generic store', domain: host, matched: true };
}
