export const EXTRACTION_ERRORS = {
  empty_url: {
    title: 'No link provided',
    hint: 'Paste a product link before extracting.'
  },
  invalid_url: {
    title: 'Invalid link',
    hint: 'Check the link and try again.'
  },
  unsupported_platform: {
    title: 'Unsupported link',
    hint: 'Only http and https web addresses can be extracted.'
  },
  blocked_host: {
    title: 'Restricted address',
    hint: 'This link points to a restricted internal address and cannot be extracted.'
  },
  blocked: {
    title: 'Extraction blocked',
    hint: 'The store blocked automated extraction of this page. Open it in your browser to check the product, or add it manually.'
  },
  not_found: {
    title: 'Product not found',
    hint: 'The store returned a 404. The product may have been removed or the link is outdated.'
  },
  server_error: {
    title: 'Store is unavailable',
    hint: 'The store is having trouble responding right now. Try again shortly.'
  },
  http_error: {
    title: 'Unexpected response',
    hint: 'The store returned an unexpected response. The link may not point to a product page.'
  },
  timeout: {
    title: 'Request timed out',
    hint: 'The store took too long to respond. Try again.'
  },
  network_error: {
    title: 'Network error',
    hint: 'Could not reach the store or the extraction service. Check your connection and try again.'
  },
  rate_limited: {
    title: 'Too many requests',
    hint: 'Extraction is rate limited for a moment. Wait a few seconds and try again.'
  },
  no_product: {
    title: 'No product found',
    hint: 'No product information could be found on that page. It may not be a product page, or the store hides its data.'
  },
  too_large: {
    title: 'Page too large',
    hint: 'The page is too large to process.'
  },
  internal: {
    title: 'Something went wrong',
    hint: 'The extraction service hit an unexpected error. Please try again.'
  }
};

export function extractionErrorInfo(code, extra = {}) {
  const entry = EXTRACTION_ERRORS[code] || EXTRACTION_ERRORS.internal;
  return { code, title: entry.title, hint: entry.hint, retryable: Boolean(extra.retryable), retryAfterMs: extra.retryAfterMs || 0 };
}
