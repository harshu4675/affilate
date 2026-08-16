import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTS = ['localhost', 'localhost.localdomain', 'metadata.google.internal', 'metadata.amazonaws.com', 'metadata.goog'];
const BLOCKED_SUFFIXES = ['.local', '.internal', '.home.arpa', '.localhost'];

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const a = parts[0];
  const b = parts[1];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

function isPrivateIpv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fec0')) return true;
  return false;
}

export async function assertSafeTarget(rawUrl, { allowLocal = false } = {}) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'unsupported_protocol' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials_in_url' };
  }
  const host = parsed.hostname.toLowerCase();
  const bare = host.replace(/^www\./, '');
  if (!bare || !host.includes('.')) {
    return { ok: false, reason: 'invalid_host' };
  }
  if (BLOCKED_HOSTS.includes(bare) || BLOCKED_SUFFIXES.some((suffix) => bare.endsWith(suffix))) {
    return { ok: false, reason: 'blocked_host' };
  }
  const isPrivateAddress = (address) => (net.isIPv4(address) ? isPrivateIpv4(address) : isPrivateIpv6(address));
  if (net.isIP(host)) {
    if (isPrivateAddress(host) && !allowLocal) return { ok: false, reason: 'private_ip' };
  } else {
    try {
      const addresses = await dns.lookup(host, { all: true });
      for (const record of addresses) {
        if (isPrivateAddress(record.address) && !allowLocal) return { ok: false, reason: 'private_ip' };
      }
    } catch {
      return { ok: false, reason: 'dns_failed' };
    }
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443' && !allowLocal) {
    return { ok: false, reason: 'blocked_port' };
  }
  return { ok: true };
}
