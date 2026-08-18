import { createAdapter, uniqueImages } from './base.js';
import { loadHtml, clean, parsePrice } from '../parser.js';

const KNOWN_PLATFORMS = ['amazon', 'ebay', 'walmart', 'etsy', 'aliexpress'];

function stripHtml(value) {
  if (!value) return '';
  const $ = loadHtml(value);
  return clean($.root().text());
}

function shopifyMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isInteger(value) ? value / 100 : value;
  const raw = String(value).trim();
  if (/^-?\d+$/.test(raw)) return Number(raw) / 100;
  return parsePrice(raw);
}

export const shopifyAdapter = createAdapter({
  id: 'shopify',
  label: 'Shopify store',
  match(host, url) {
    if (KNOWN_PLATFORMS.some((id) => id === host.split('.')[0])) return false;
    try {
      const path = new URL(url).pathname;
      return /^\/products\/[^/?#]+/.test(path);
    } catch {
      return false;
    }
  },
  async extract({ url, fetchJson }) {
    let origin;
    let handle = '';
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
      handle = parsed.pathname.split('/products/')[1] || '';
    } catch {
      return {};
    }
    const base = `${origin}/products/${handle}`;
    const result = await fetchJson(`${base}.js`);
    if (result.error || !result.json) return {};
    const product = result.json;
    const variants = (product.variants || []).map((variant) => ({
      type: 'Variant',
      value: clean(variant.title),
      sku: clean(variant.sku),
      price: shopifyMoney(variant.price),
      compareAtPrice: shopifyMoney(variant.compare_at_price),
      available: variant.available
    }));
    const images = (product.images || []).map((image) => {
      const src = image.src || '';
      return /^\/\//.test(src) ? `https:${src}` : src;
    });
    return {
      title: clean(product.title),
      description: stripHtml(product.body_html),
      brand: clean(product.vendor),
      category: clean(product.product_type),
      sku: variants.length ? variants[0].sku : '',
      productId: clean(product.handle),
      price: variants.length && variants[0].price != null ? variants[0].price : null,
      originalPrice: variants.length && variants[0].compareAtPrice != null ? variants[0].compareAtPrice : null,
      currency: '',
      availability: product.available === true ? 'In stock' : product.available === false ? 'Out of stock' : '',
      seller: clean(product.vendor),
      images: uniqueImages(images),
      variants,
      specifications: [],
      features: Array.isArray(product.tags) ? product.tags.map((tag) => clean(tag)).filter(Boolean) : []
    };
  }
});
