import { normalizeUrl, canonicalizeAmazonUrl } from './url.js';
import { assertSafeTarget } from '../security.js';
import { detectPlatform } from './detect.js';
import { getAdapter } from './adapters/index.js';
import { fetchHtml, fetchJson } from './fetch.js';
import { extractInLayers, mergeRawProducts } from './layers.js';
import { normalizeProduct, analyzeCoverage } from './normalize.js';

function createDiagnostics(url) {
  return {
    id: `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    url: typeof url === 'string' ? url : '',
    normalizedUrl: '',
    finalUrl: '',
    detectedPlatform: '',
    finalPlatform: '',
    methodsAttempted: [],
    methodSuccessful: [],
    responseStatus: 0,
    redirects: [],
    startedAt: new Date().toISOString(),
    durationMs: 0,
    fieldsFound: [],
    fieldsMissing: [],
    errorReason: ''
  };
}

function finish(diagnostics, started) {
  diagnostics.durationMs = Date.now() - started;
  return diagnostics;
}

function fail(code, message, retryable, diagnostics, started, details = {}) {
  diagnostics.errorReason = code;
  return {
    ok: false,
    error: { code, message, retryable, ...details },
    diagnostics: finish(diagnostics, started)
  };
}

function safetyFailure(safe, diagnostics, started) {
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
  const [code, message] = map[safe.reason] || ['invalid_url', 'The URL could not be used for extraction.'];
  return fail(code, message, false, diagnostics, started);
}

function fetchFailure(page, diagnostics, started) {
  diagnostics.responseStatus = page.status || 0;
  diagnostics.redirects = page.redirects || [];
  const map = {
    rate_limited: ['rate_limited', 'The store rate limited the request. Please wait a moment and retry.', true],
    blocked: ['blocked', 'The store blocked automated extraction of this page.', false],
    blocked_redirect: ['blocked_host', 'The store redirected to a restricted address.', false],
    invalid_redirect: ['network_error', 'The store returned an invalid redirect.', true],
    too_many_redirects: ['network_error', 'The store redirected too many times.', true],
    not_found: ['not_found', 'The product page was not found on the store.', false],
    server_error: ['server_error', 'The store returned a server error. It may be temporary.', true],
    http_error: ['http_error', 'The store returned an unexpected response.', false],
    timeout: ['timeout', 'The store took too long to respond. Please retry.', true],
    network_error: ['network_error', 'Could not reach the store. Check your connection and retry.', true],
    too_large: ['too_large', 'The page was too large to process.', false],
    not_html: ['no_product', 'The link does not point to a product page.', false]
  };
  const entry = map[page.error] || ['internal', 'Extraction failed. Please try again.', true];
  return fail(entry[0], entry[1], entry[2], diagnostics, started, { responseStatus: page.status || 0 });
}

function isBlockedPage(html, platformId) {
  const sample = String(html || '').slice(0, 500000).toLowerCase();
  if (/captcha|verify you are human|access denied|unusual traffic|automated access/.test(sample)) return true;
  if (platformId === 'amazon' && /robot check|enter the characters you see below|api-services-support@amazon/.test(sample)) return true;
  return false;
}

function canonicalFinalUrl(url, platformId) {
  const normalized = normalizeUrl(url);
  const cleaned = normalized.ok ? normalized.url : url;
  if (platformId !== 'amazon') return cleaned;
  const parsed = canonicalizeAmazonUrl(cleaned);
  return parsed ? parsed.toString() : cleaned;
}

function fieldNames(product) {
  return Object.entries(product || {})
    .filter(([, value]) => value !== '' && value != null && (!Array.isArray(value) || value.length > 0))
    .map(([field]) => field);
}

export async function runExtraction({ url, allowLocal = false }) {
  const started = Date.now();
  const diagnostics = createDiagnostics(url);
  if (!url || typeof url !== 'string') {
    return fail('invalid_url', 'Please provide a product URL.', false, diagnostics, started);
  }

  const normalized = normalizeUrl(url);
  if (!normalized.ok) {
    const messages = {
      empty: 'Please paste a product link first.',
      too_long: 'The URL is too long. Please use a shorter product link.',
      invalid: 'That does not look like a valid URL. Check the link and try again.',
      protocol: 'Only http and https links are supported.',
      host: 'The URL does not point to a valid website.'
    };
    const code = normalized.reason === 'protocol' ? 'unsupported_platform' : 'invalid_url';
    return fail(code, messages[normalized.reason] || 'Invalid URL.', false, diagnostics, started);
  }
  diagnostics.normalizedUrl = normalized.url;

  const safe = await assertSafeTarget(normalized.url, { allowLocal });
  if (!safe.ok) return safetyFailure(safe, diagnostics, started);

  const safeRedirect = async (redirectUrl) => {
    const result = await assertSafeTarget(redirectUrl, { allowLocal });
    return result.ok;
  };
  const safeFetchJson = (target, options = {}) => fetchJson(target, { ...options, onRedirect: safeRedirect });

  let platform = detectPlatform(normalized.url);
  diagnostics.detectedPlatform = platform.id;
  let adapter = getAdapter(platform.id);
  let raw = {};
  let evidence = false;
  let finalUrl = normalized.url;

  if (platform.id === 'shopify') {
    diagnostics.methodsAttempted.push('shopify-product-json');
    try {
      raw = (await adapter.extract({ url: normalized.url, platform, fetchJson: safeFetchJson })) || {};
    } catch {
      raw = {};
    }
    if (raw.title && (raw.price != null || (raw.images && raw.images.length) || raw.productId)) {
      evidence = true;
      diagnostics.methodSuccessful.push('shopify-product-json');
    }
  }

  if (!evidence || platform.id === 'shopify') {
    const page = await fetchHtml(normalized.url, { onRedirect: safeRedirect });
    diagnostics.responseStatus = page.status || 0;
    diagnostics.redirects = page.redirects || [];
    if (page.error) {
      if (!evidence) return fetchFailure(page, diagnostics, started);
      diagnostics.methodsAttempted.push('html-fallback');
    } else {
      finalUrl = page.finalUrl || normalized.url;
      diagnostics.finalUrl = finalUrl;

      const redirectedPlatform = detectPlatform(finalUrl);
      if (redirectedPlatform.id !== 'generic' || platform.id === 'generic') platform = redirectedPlatform;
      diagnostics.finalPlatform = platform.id;
      adapter = getAdapter(platform.id);

      if (isBlockedPage(page.html, platform.id)) {
        if (!evidence) {
          return fail(
            'blocked',
            'The store returned a verification page instead of the product. Open the source in your browser or retry later.',
            true,
            diagnostics,
            started,
            { responseStatus: page.status || 0 }
          );
        }
      } else {
        const layered = await extractInLayers({
          html: page.html,
          url: finalUrl,
          platform,
          adapter: platform.id === 'shopify' ? getAdapter('generic') : adapter,
          fetchJson: safeFetchJson
        });
        raw = mergeRawProducts([raw, layered.product]);
        evidence = evidence || layered.evidence;
        diagnostics.methodsAttempted.push(...layered.layers.map((layer) => layer.method));
        diagnostics.methodSuccessful.push(...layered.layers.filter((layer) => layer.successful).map((layer) => layer.method));
        diagnostics.layers = layered.layers;
      }
    }
  }
  diagnostics.finalPlatform = diagnostics.finalPlatform || platform.id;
  diagnostics.finalUrl = diagnostics.finalUrl || finalUrl;

  if (!raw || typeof raw !== 'object') raw = {};
  const sourceFinalUrl = canonicalFinalUrl(finalUrl, platform.id);
  const product = normalizeProduct(raw, { platform: platform.id, url: normalized.url, finalUrl: sourceFinalUrl });
  const analysis = analyzeCoverage(product, { evidence });
  diagnostics.fieldsFound = fieldNames(product);
  diagnostics.fieldsMissing = analysis.missingFields;

  if (!analysis.productLike) {
    return fail(
      'no_product',
      'No product information could be found after trying structured data, product metadata, platform selectors and embedded page data.',
      false,
      diagnostics,
      started,
      {
        partial: diagnostics.fieldsFound.length > 0,
        fieldsFound: analysis.fieldsFound
      }
    );
  }

  const partial = analysis.coverage < 60;
  diagnostics.errorReason = '';
  return {
    ok: true,
    data: {
      product,
      source: {
        platform: platform.id,
        platformLabel: platform.label,
        domain: (() => {
          try {
            return new URL(sourceFinalUrl).hostname;
          } catch {
            return platform.domain;
          }
        })(),
        originalUrl: String(url).trim(),
        url: normalized.url,
        finalUrl: sourceFinalUrl,
        extractedAt: new Date().toISOString(),
        coverage: analysis.coverage,
        missingFields: analysis.missingFields,
        partial,
        extractionMethod: diagnostics.methodSuccessful[0] || ''
      }
    },
    diagnostics: finish(diagnostics, started)
  };
}
