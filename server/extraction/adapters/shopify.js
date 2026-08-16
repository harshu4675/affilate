import { createAdapter, uniqueImages } from './base.js';
import { loadHtml, clean, parsePrice } from '../parser.js';

const KNOWN_PLATFORMS = ['amazon', 'ebay', 'walmart', 'etsy', 'aliexpress'];

function stripHtml(value) {
  if (!value) return '';
  const $ = loadHtml(value);
  return clean($.root().text());
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
      price: variant.price != null ? parsePrice(String(variant.price)) : null,
      compareAtPrice: variant.compare_at_price != null ? parsePrice(String(variant.compare_at_price)) : null,
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
      availability: product.available ? 'In stock' : 'Out of stock',
      seller: clean(product.vendor),
      images: uniqueImages(images),
      variants,
      specifications: [],
      features: Array.isArray(product.tags) ? product.tags.map((tag) => clean(tag)).filter(Boolean) : []
    };
  }
});
