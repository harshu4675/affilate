import { clean, round2 } from './parser.js';

export function normalizeProduct(raw, { platform, url, finalUrl }) {
  const images = cleanImages(raw.images || [], platform, finalUrl || url);
  const price = toNumber(raw.price);
  let originalPrice = toNumber(raw.originalPrice);
  if (price != null && originalPrice != null && originalPrice <= price) originalPrice = null;
  const discountPercent =
    price != null && originalPrice != null && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;
  return {
    title: clean(raw.title),
    shortDescription: clean(raw.shortDescription),
    description: clean(raw.description),
    brand: clean(raw.brand),
    category: clean(raw.category),
    subcategory: clean(raw.subcategory),
    sku: clean(raw.sku),
    productId: clean(raw.productId),
    currency: clean(raw.currency),
    price,
    originalPrice,
    discountPercent,
    availability: clean(raw.availability),
    condition: clean(raw.condition),
    seller: clean(raw.seller),
    images,
    variants: cleanVariants(raw.variants),
    specifications: cleanSpecs(raw.specifications),
    features: cleanFeatures(raw.features),
    tags: cleanFeatures(raw.tags)
  };
}

function toNumber(value) {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(num)) return null;
  return round2(num);
}

function cleanImages(images, platform, baseUrl) {
  const seen = new Set();
  const out = [];
  for (const image of images) {
    let url = clean(image && (typeof image === 'string' ? image : image.url || image.src));
    if (!url) continue;
    if (url.startsWith('//')) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url)) {
      try {
        url = new URL(url, baseUrl).toString();
      } catch {
        continue;
      }
    }
    const normalized = normalizePlatformImage(url, platform);
    const key = normalized.replace(/^https?:/i, 'http:');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 20) break;
  }
  return out;
}

function normalizePlatformImage(url, platform) {
  if (platform === 'amazon') {
    return url
      .replace(/\._[A-Z0-9_]+_[A-Z0-9]+_\./g, '.')
      .replace(/\._AC_SL\d+_\./g, '.')
      .replace(/\._SY\d+_\./g, '.')
      .replace(/\._SX\d+_\./g, '.');
  }
  if (platform === 'etsy') {
    return url
      .replace(/__SX\d+__/g, '__')
      .replace(/__SY\d+__/g, '__')
      .replace(/il_([a-z0-9]+)x([a-z0-9]+)/i, 'il_fullxfull');
  }
  return url;
}

function cleanVariants(variants) {
  if (!Array.isArray(variants)) return [];
  const seen = new Set();
  const out = [];
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') continue;
    const type = clean(variant.type || variant.option1 || 'Variant');
    const value = clean(variant.value || variant.option_value || variant.title);
    if (!type && !value) continue;
    const price = toNumber(variant.price);
    const compareAtPrice = toNumber(variant.compareAtPrice != null ? variant.compareAtPrice : variant.compare_at_price);
    const row = {
      id: '',
      type,
      value,
      sku: clean(variant.sku),
      price,
      compareAtPrice,
      available: variant.available
    };
    const key = `${type}|${value}|${price}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= 100) break;
  }
  return out;
}

function cleanSpecs(specifications) {
  if (!Array.isArray(specifications)) return [];
  const seen = new Set();
  const out = [];
  for (const spec of specifications) {
    if (!spec || typeof spec !== 'object') continue;
    const label = clean(spec.label || spec.name || spec.propertyID);
    const value = clean(spec.value);
    if (!label || !value) continue;
    const key = `${label}|${value}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: '', label, value });
    if (out.length >= 50) break;
  }
  return out;
}

function cleanFeatures(features) {
  if (!Array.isArray(features)) return [];
  const seen = new Set();
  const out = [];
  for (const feature of features) {
    const value = clean(feature);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= 30) break;
  }
  return out;
}

const KEY_FIELDS = ['title', 'description', 'price', 'images', 'brand', 'category', 'availability'];

export function analyzeCoverage(product, { evidence = true } = {}) {
  const missing = [];
  const fieldsFound = [];
  for (const field of KEY_FIELDS) {
    const value = product[field];
    const present = field === 'images' ? Array.isArray(value) && value.length > 0 : value !== '' && value != null;
    if (!present) missing.push(field);
    else fieldsFound.push(field);
  }
  const coverage = Math.round(((KEY_FIELDS.length - missing.length) / KEY_FIELDS.length) * 100);
  const productLike = Boolean(
    evidence &&
      product.title &&
      (product.price != null || product.images.length > 0 || product.productId || product.sku)
  );
  return { coverage, missingFields: missing, fieldsFound, productLike };
}
