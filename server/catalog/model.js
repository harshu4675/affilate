/**
 * Storefront catalog model.
 *
 * This is a thin, additive layer on top of the product records produced by the
 * existing extraction/import pipeline. It never re-extracts or re-normalizes
 * anything: it only picks the fields the storefront needs, sanitizes them and
 * adds storefront-only state (visibility, publish timestamps).
 */

const MAX_IMAGES = 6;
const MAX_TEXT = 400;
const MAX_DESCRIPTION = 4000;
const MAX_LIST = 20;

export const ADMIN_EDITABLE_FIELDS = [
  'title',
  'shortDescription',
  'description',
  'brand',
  'category',
  'price',
  'originalPrice',
  'currency',
  'affiliateUrl'
];

function text(value, max = MAX_TEXT) {
  if (value == null) return '';
  return String(value).trim().slice(0, max);
}

function num(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function safeHttpUrl(value) {
  if (!value) return '';
  try {
    const parsed = new URL(String(value).trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function safeImageUrl(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^data:image\//i.test(raw)) return raw.length <= 400000 ? raw : '';
  return safeHttpUrl(raw);
}

function sanitizeImages(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  const out = [];
  const ordered = [...images].sort((a, b) => {
    const ap = a && a.isPrimary ? -1 : 0;
    const bp = b && b.isPrimary ? -1 : 0;
    if (ap !== bp) return ap - bp;
    return (a && a.position != null ? a.position : 0) - (b && b.position != null ? b.position : 0);
  });
  for (const image of ordered) {
    const url = safeImageUrl(typeof image === 'string' ? image : image && image.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, alt: text(typeof image === 'object' && image ? image.alt : '', 160) });
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

function computeDiscount(price, originalPrice, provided) {
  if (price != null && originalPrice != null && originalPrice > price && originalPrice > 0) {
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  const explicit = num(provided);
  if (explicit != null && explicit > 0 && explicit < 100) return Math.round(explicit);
  return null;
}

/**
 * Resolve the outbound purchase URL for a catalog record.
 * Priority: explicit affiliate URL -> original (tracked) source URL -> clean source URL.
 */
export function resolvePurchaseUrl(record) {
  if (!record) return '';
  const source = record.source || {};
  const candidates = [record.affiliateUrl, source.originalUrl, source.url, source.finalUrl];
  for (const candidate of candidates) {
    const safe = safeHttpUrl(candidate);
    if (safe) return safe;
  }
  return '';
}

/**
 * Build a storefront catalog record from a library product coming from the
 * existing import pipeline. `existing` (if present) preserves storefront-only
 * state and admin overrides.
 */
export function buildCatalogRecord(product, existing = null, options = {}) {
  if (!product || typeof product !== 'object' || !product.id) return null;
  const now = new Date().toISOString();
  const source = product.source && typeof product.source === 'object' ? product.source : {};
  const overrides = existing && Array.isArray(existing.adminEditedFields) ? existing.adminEditedFields : [];
  const keepOverrides = options.force !== true;

  const base = {
    id: String(product.id),
    title: text(product.title),
    shortDescription: text(product.shortDescription, 600),
    description: text(product.description, MAX_DESCRIPTION),
    brand: text(product.brand, 120),
    category: text(product.category, 120),
    subcategory: text(product.subcategory, 120),
    currency: text(product.currency, 8),
    price: num(product.price),
    originalPrice: num(product.originalPrice),
    availability: text(product.availability, 80),
    condition: text(product.condition, 80),
    seller: text(product.seller, 160),
    sku: text(product.sku, 120),
    productId: text(product.productId, 120),
    images: sanitizeImages(product.images),
    features: Array.isArray(product.features) ? product.features.slice(0, MAX_LIST).map((item) => text(item, 300)).filter(Boolean) : [],
    tags: Array.isArray(product.tags) ? product.tags.slice(0, MAX_LIST).map((item) => text(item, 60)).filter(Boolean) : [],
    specifications: Array.isArray(product.specifications)
      ? product.specifications
          .slice(0, MAX_LIST)
          .map((spec) => ({ label: text(spec && spec.label, 120), value: text(spec && spec.value, 300) }))
          .filter((spec) => spec.label && spec.value)
      : [],
    affiliateUrl: safeHttpUrl(product.affiliateUrl),
    source: {
      url: safeHttpUrl(source.url),
      originalUrl: safeHttpUrl(source.originalUrl),
      finalUrl: safeHttpUrl(source.finalUrl),
      platform: text(source.platform, 40) || 'generic',
      platformLabel: text(source.platformLabel, 80) || 'Store',
      domain: text(source.domain, 160),
      extractedAt: text(source.extractedAt, 40)
    },
    status: text(product.status, 24) || 'draft',
    libraryUpdatedAt: text(product.updatedAt, 40) || now,
    createdAt: text(product.createdAt, 40) || now
  };

  if (existing && keepOverrides) {
    for (const field of overrides) {
      if (ADMIN_EDITABLE_FIELDS.includes(field) && Object.prototype.hasOwnProperty.call(existing, field)) {
        base[field] = existing[field];
      }
    }
  }

  base.discountPercent = computeDiscount(base.price, base.originalPrice, product.discountPercent);
  base.purchaseUrl = resolvePurchaseUrl(base);

  return {
    ...base,
    visible: existing ? existing.visible !== false : true,
    adminEditedFields: keepOverrides ? overrides.filter((field) => ADMIN_EDITABLE_FIELDS.includes(field)) : [],
    publishedAt: existing && existing.publishedAt ? existing.publishedAt : now,
    updatedAt: now
  };
}

/** Apply an admin edit to an existing catalog record. */
export function applyAdminPatch(record, patch) {
  if (!record) return null;
  const next = { ...record };
  const edited = new Set(record.adminEditedFields || []);

  for (const field of ADMIN_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
    if (field === 'price' || field === 'originalPrice') next[field] = num(patch[field]);
    else if (field === 'affiliateUrl') next[field] = safeHttpUrl(patch[field]);
    else if (field === 'description') next[field] = text(patch[field], MAX_DESCRIPTION);
    else if (field === 'shortDescription') next[field] = text(patch[field], 600);
    else next[field] = text(patch[field]);
    edited.add(field);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'visible')) next.visible = patch.visible !== false;

  next.adminEditedFields = [...edited];
  next.discountPercent = computeDiscount(next.price, next.originalPrice, next.discountPercent);
  next.purchaseUrl = resolvePurchaseUrl(next);
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Public projection served to storefront visitors. */
export function toPublicProduct(record) {
  return {
    id: record.id,
    title: record.title,
    shortDescription: record.shortDescription,
    description: record.description,
    brand: record.brand,
    category: record.category,
    currency: record.currency,
    price: record.price,
    originalPrice: record.originalPrice,
    discountPercent: record.discountPercent,
    availability: record.availability,
    condition: record.condition,
    seller: record.seller,
    images: record.images,
    features: record.features,
    specifications: record.specifications,
    tags: record.tags,
    store: {
      platform: record.source ? record.source.platform : 'generic',
      label: record.source ? record.source.platformLabel : 'Store',
      domain: record.source ? record.source.domain : ''
    },
    hasPurchaseUrl: Boolean(resolvePurchaseUrl(record)),
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt
  };
}
