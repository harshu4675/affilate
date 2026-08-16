import { ADAPTERS } from './adapters/index.js';

export function detectPlatform(url) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { id: 'generic', label: 'Generic store', domain: '' };
  }
  for (const adapter of ADAPTERS) {
    if (adapter.id === 'generic') continue;
    if (adapter.match(host, url)) {
      return { id: adapter.id, label: adapter.label, domain: host };
    }
  }
  return { id: 'generic', label: 'Generic store', domain: host };
}
