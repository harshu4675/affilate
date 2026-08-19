export function validateProduct(product) {
  const errors = {};
  const warnings = {};
  const title = String(product.title || '').trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > 300) errors.title = 'Title must be 300 characters or fewer.';

  const price = product.price;
  if (price != null && price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
    errors.price = 'Price must be a positive number.';
  }
  const originalPrice = product.originalPrice;
  if (originalPrice != null && originalPrice !== '' && (!Number.isFinite(Number(originalPrice)) || Number(originalPrice) < 0)) {
    errors.originalPrice = 'Original price must be a positive number.';
  }
  if (price != null && price !== '' && originalPrice != null && originalPrice !== '') {
    if (Number(originalPrice) < Number(price)) errors.originalPrice = 'Original price cannot be lower than the selling price.';
  }
  if (price != null && price !== '' && !product.currency) warnings.currency = 'A currency is recommended when a price is set.';

  if (product.source && product.source.url) {
    try {
      const parsed = new URL(product.source.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') errors.sourceUrl = 'Source URL must be http or https.';
    } catch {
      errors.sourceUrl = 'Source URL is not valid.';
    }
  }

  if (product.affiliateUrl) {
    try {
      const parsed = new URL(product.affiliateUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') errors.affiliateUrl = 'Affiliate URL must be http or https.';
    } catch {
      errors.affiliateUrl = 'Affiliate URL is not valid.';
    }
  }

  if (!Array.isArray(product.images) || product.images.length === 0) {
    warnings.images = 'This product has no images. You can add one before publishing.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}
