import { normalizeUrl } from './url.js';
import { assertSafeTarget } from '../security.js';
import { detectPlatform } from './detect.js';
import { getAdapter } from './adapters/index.js';
import { fetchHtml, fetchJson } from './fetch.js';
import { normalizeProduct, analyzeCoverage } from './normalize.js';

function fail(code, message, retryable = false) {
  return { ok: false, error: { code, message, retryable } };
}

function mapSafetyReason(reason) {
  const map = {
    invalid_url: ['invalid_url', 'The URL could not be parsed.'],
    unsupported_protocol: ['unsupported_platform', 'Only http and https links can be extracted.'],
    credentials_in_url: ['invalid_url', 'URLs containing login credentials are not allowed.'],
    blocked_port: ['blocked_host', 'The link uses a blocked network port.'],
    invalid_host: ['invalid_url', 'The URL does not point to a valid website.'],
    blocked_host: ['blocked_host', 'The link points to a restricted internal address.'],
    private_ip: ['blocked_host', 'The link points to a private or internal address and cannot be extracted.'],
    dns_failed: ['network_error', 'The domain could not be resolved.']
  };
  return map[reason] || ['invalid_url', 'The URL could not be used for extraction.'];
}

function mapFetchError(error) {
  const map = {
    rate_limited: ['rate_limited', 'The store rate limited the request. Please wait a moment and retry.', true],
    blocked: ['blocked', 'The store blocked automated extraction of this page.', false],
    not_found: ['not_found', 'The product page was not found on the store.', false],
    server_error: ['server_error', 'The store returned a server error. It may be temporary.', true],
    http_error: ['http_error', 'The store returned an unexpected response.', false],
    timeout: ['timeout', 'The store took too long to respond. Please retry.', true],
    network_error: ['network_error', 'Could not reach the store. Check your connection and retry.', true],
    too_large: ['blocked', 'The page was too large to process.', false],
    not_html: ['no_product', 'The link does not point to a product page.', false]
  };
  const entry = map[error] || ['internal', 'Extraction failed. Please try again.', true];
  return fail(entry[0], entry[1], entry[2]);
}

export async function runExtraction({ url, allowLocal = false }) {
  if (!url || typeof url !== 'string') return fail('invalid_url', 'Please provide a product URL.', false);
  const normalized = normalizeUrl(url);
  if (!normalized.ok) {
    const messages = {
      empty: 'Please paste a product link first.',
      too_long: 'The URL is too long. Please use a shorter product link.',
      invalid: 'That does not look like a valid URL. Check the link and try again.',
      protocol: 'Only http and https links are supported.',
      host: 'The URL does not point to a valid website.'
    };
    return fail(normalized.reason === 'protocol' ? 'unsupported_platform' : 'invalid_url', messages[normalized.reason] || 'Invalid URL.', false);
  }

  const safe = await assertSafeTarget(normalized.url, { allowLocal });
  if (!safe.ok) {
    const [code, message] = mapSafetyReason(safe.reason);
    return fail(code, message, false);
  }

  const platform = detectPlatform(normalized.url);
  const adapter = getAdapter(platform.id);

  let html = '';
  let finalUrl = normalized.url;
  let raw = {};

  if (platform.id === 'shopify') {
    raw = await adapter.extract({ url: normalized.url, platform, fetchJson });
    if (!raw || !raw.title) {
      const htmlResult = await fetchHtml(normalized.url);
      if (htmlResult.error) return mapFetchError(htmlResult.error);
      html = htmlResult.html;
      finalUrl = htmlResult.finalUrl || normalized.url;
      raw = getAdapter('generic').extract({ html, url: finalUrl, platform: { id: 'generic' } });
    }
  } else {
    const pageResult = await fetchHtml(normalized.url);
    if (pageResult.error) return mapFetchError(pageResult.error);
    html = pageResult.html;
    finalUrl = pageResult.finalUrl || normalized.url;
    raw = await adapter.extract({ html, url: finalUrl, platform, fetchJson });
  }

  if (!raw || typeof raw !== 'object') raw = {};
  const product = normalizeProduct(raw, { platform: platform.id, url: normalized.url, finalUrl });
  const analysis = analyzeCoverage(product);
  const partial = !analysis.productLike || analysis.coverage < 60;

  if (!analysis.productLike) {
    return fail(
      'no_product',
      'No product information could be found on that page. It may not be a product page, or the store hides its data.',
      false
    );
  }

  return {
    ok: true,
    data: {
      product,
      source: {
        platform: platform.id,
        platformLabel: platform.label,
        domain: platform.domain,
        url: normalized.url,
        finalUrl,
        extractedAt: new Date().toISOString(),
        coverage: analysis.coverage,
        missingFields: analysis.missingFields,
        partial
      }
    }
  };
}
