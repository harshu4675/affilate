export function validateUrlInput(input) {
  const value = String(input || '').trim();
  if (!value) return { valid: false, empty: true, reason: 'empty' };
  if (value.length > 2048) return { valid: false, reason: 'too_long' };
  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { valid: false, reason: 'invalid' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'protocol' };
  }
  if (!parsed.hostname.includes('.')) return { valid: false, reason: 'host' };
  if (parsed.username || parsed.password) return { valid: false, reason: 'credentials' };
  return { valid: true };
}

export const URL_VALIDATION_MESSAGES = {
  empty: 'Paste a product link to get started.',
  too_long: 'This link is too long. Please use a shorter product URL.',
  invalid: 'This does not look like a valid URL.',
  protocol: 'Only http and https links are supported.',
  host: 'This link does not point to a valid website.',
  credentials: 'URLs containing login credentials are not allowed.'
};
