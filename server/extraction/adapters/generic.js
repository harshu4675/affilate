import { createAdapter, metaProduct, uniqueImages, breadcrumbCategory } from './base.js';
import { loadHtml, textOf, firstText, metaMap, jsonLdProducts, jsonLdImages, specificValues } from '../parser.js';

export const genericAdapter = createAdapter({
  id: 'generic',
  label: 'Generic store',
  match() {
    return true;
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = fallback.title;
    const price = fallback.price;
    const originalPrice = fallback.originalPrice;
    const images = uniqueImages([...jsonLdImages(jsonLdProducts($)[0] || {}), ...fallback.images]);
    const description = fallback.description || textOf($, 'meta[name="description"]');
    const category = fallback.category || breadcrumbCategory($);
    const brand = fallback.brand || firstText(['[itemprop="brand"]', 'meta[itemprop="brand"]'], $);
    return {
      title,
      description,
      brand,
      category,
      sku: fallback.sku,
      productId: fallback.productId,
      price,
      originalPrice,
      currency: fallback.currency,
      availability: fallback.availability,
      seller: fallback.seller,
      images,
      variants: [],
      specifications: specificValues($, '[itemprop="additionalProperty"] table, .specs table, #specifications table, .product-specs table'),
      features: []
    };
  }
});
