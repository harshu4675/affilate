import { normalizeImageUrl } from '../services/imageService.js';
import { createId } from './id.js';

export const REFRESH_GROUPS = [
  { id: 'basic', label: 'Title, description, brand and category' },
  { id: 'pricing', label: 'Price and currency' },
  { id: 'images', label: 'Images' },
  { id: 'variants', label: 'Variants' },
  { id: 'specs', label: 'Specifications and features' },
  { id: 'other', label: 'Availability, seller and condition' }
];

const GROUP_PATHS = {
  basic: ['title', 'shortDescription', 'description', 'brand', 'category', 'subcategory', 'sku', 'productId'],
  pricing: ['price', 'originalPrice', 'currency'],
  images: ['images'],
  variants: ['variants'],
  specs: ['specifications', 'features', 'tags'],
  other: ['availability', 'condition', 'seller']
};

export function computeDiscount(price, originalPrice) {
  const p = price == null || price === '' ? null : Number(price);
  const o = originalPrice == null || originalPrice === '' ? null : Number(originalPrice);
  if (p == null || o == null || !Number.isFinite(p) || !Number.isFinite(o) || o <= p) return null;
  return Math.round(((o - p) / o) * 100);
}

export function mergeRefreshed(prev, fresh, groups, platform) {
  const groupSet = new Set(groups);
  const apply = (group, patch) => (groupSet.has(group) ? patch : {});
  const freshImages = (fresh.images || []).map((url, index) => ({
    id: createId('img'),
    url: normalizeImageUrl(url, platform),
    alt: '',
    position: index,
    isPrimary: index === 0,
    source: 'extracted'
  }));
  const removedUrls = new Set((prev.removedImages || []).map((image) => image.url));
  const userImages = (prev.images || []).filter((image) => image.source === 'user');
  let images;
  if (groupSet.has('images')) {
    images = [...freshImages.filter((image) => !removedUrls.has(image.url)), ...userImages];
  } else {
    images = prev.images || [];
  }

  const price = groupSet.has('pricing') ? fresh.price : prev.price;
  const originalPrice = groupSet.has('pricing') ? fresh.originalPrice : prev.originalPrice;

  const next = {
    ...prev,
    ...apply('basic', {
      title: fresh.title || '',
      shortDescription: fresh.shortDescription || '',
      description: fresh.description || '',
      brand: fresh.brand || '',
      category: fresh.category || '',
      subcategory: fresh.subcategory || '',
      sku: fresh.sku || '',
      productId: fresh.productId || ''
    }),
    ...apply('pricing', {
      price,
      originalPrice,
      currency: fresh.currency || prev.currency
    }),
    discountPercent: computeDiscount(price, originalPrice),
    ...apply('images', { images }),
    ...apply('variants', {
      variants: (fresh.variants || []).map((variant) => ({
        id: createId('var'),
        type: variant.type || 'Variant',
        value: variant.value || '',
        sku: variant.sku || '',
        price: variant.price != null ? variant.price : null,
        compareAtPrice: variant.compareAtPrice != null ? variant.compareAtPrice : null,
        available: variant.available
      }))
    }),
    ...apply('specs', {
      specifications: (fresh.specifications || []).map((spec) => ({
        id: createId('spec'),
        label: spec.label || '',
        value: spec.value || ''
      })),
      features: fresh.features || [],
      tags: fresh.tags || []
    }),
    ...apply('other', {
      availability: fresh.availability || '',
      condition: fresh.condition || '',
      seller: fresh.seller || ''
    }),
    source: {
      ...prev.source,
      lastRefreshedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  const edited = new Set(prev.editedFields || []);
  for (const group of groups) {
    for (const path of GROUP_PATHS[group] || []) edited.delete(path);
  }
  next.editedFields = [...edited];
  return next;
}
