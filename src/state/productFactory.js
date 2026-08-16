import { createId } from '../utils/id.js';
import { normalizeImageUrl } from '../services/imageService.js';

export function createProductFromExtraction(data) {
  const now = new Date().toISOString();
  const { product, source } = data;
  return {
    id: createId('prod'),
    title: product.title || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    brand: product.brand || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    sku: product.sku || '',
    productId: product.productId || '',
    currency: product.currency || '',
    price: product.price != null ? product.price : null,
    originalPrice: product.originalPrice != null ? product.originalPrice : null,
    discountPercent: product.discountPercent != null ? product.discountPercent : null,
    availability: product.availability || '',
    condition: product.condition || '',
    seller: product.seller || '',
    images: (product.images || []).map((url, index) => ({
      id: createId('img'),
      url: normalizeImageUrl(url, source.platform),
      alt: '',
      position: index,
      isPrimary: index === 0,
      source: 'extracted'
    })),
    removedImages: [],
    variants: (product.variants || []).map((variant) => ({
      id: createId('var'),
      type: variant.type || 'Variant',
      value: variant.value || '',
      sku: variant.sku || '',
      price: variant.price != null ? variant.price : null,
      compareAtPrice: variant.compareAtPrice != null ? variant.compareAtPrice : null,
      available: variant.available
    })),
    specifications: (product.specifications || []).map((spec) => ({
      id: createId('spec'),
      label: spec.label || '',
      value: spec.value || ''
    })),
    features: (product.features || []).map((feature) => String(feature)),
    tags: (product.tags || []).map((tag) => String(tag)),
    source: {
      url: source.url || '',
      finalUrl: source.finalUrl || source.url || '',
      platform: source.platform || 'generic',
      platformLabel: source.platformLabel || 'Generic store',
      domain: source.domain || '',
      extractedAt: source.extractedAt || now,
      lastRefreshedAt: source.extractedAt || now,
      partial: Boolean(source.partial),
      missingFields: Array.isArray(source.missingFields) ? source.missingFields : []
    },
    status: 'draft',
    editedFields: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createEmptyProduct() {
  const now = new Date().toISOString();
  return {
    id: createId('prod'),
    title: '',
    shortDescription: '',
    description: '',
    brand: '',
    category: '',
    subcategory: '',
    sku: '',
    productId: '',
    currency: '',
    price: null,
    originalPrice: null,
    discountPercent: null,
    availability: '',
    condition: '',
    seller: '',
    images: [],
    removedImages: [],
    variants: [],
    specifications: [],
    features: [],
    tags: [],
    source: {
      url: '',
      finalUrl: '',
      platform: '',
      platformLabel: '',
      domain: '',
      extractedAt: now,
      lastRefreshedAt: ''
    },
    status: 'draft',
    editedFields: [],
    createdAt: now,
    updatedAt: now
  };
}

export function duplicateProduct(product) {
  const now = new Date().toISOString();
  return {
    ...product,
    id: createId('prod'),
    title: product.title ? `${product.title}` : '',
    status: 'draft',
    editedFields: [],
    removedImages: [],
    createdAt: now,
    updatedAt: now
  };
}
