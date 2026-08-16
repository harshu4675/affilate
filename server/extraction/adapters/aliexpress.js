import { createAdapter, metaProduct, uniqueImages } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap, jsonLdProducts, jsonLdImages } from '../parser.js';

export const aliexpressAdapter = createAdapter({
  id: 'aliexpress',
  label: 'AliExpress',
  match(host) {
    return host === 'aliexpress.com' || host === 'aliexpress.us' || host.endsWith('.aliexpress.com') || host.endsWith('.aliexpress.us') || host === 'aliexpress.ru';
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = firstText(['h1[itemprop="name"]', '[data-pl="product-title"]', 'h1.product-title-text'], $) || fallback.title;
    const price = firstPrice(['[itemprop="price"]', 'span[itemprop="price"]', '.product-price-value', '[data-pl="product-price"]'], $) ?? fallback.price;
    const originalPrice = firstPrice(['.product-price-original', '[data-pl="original-price"]', '.price--originalText'], $) ?? fallback.originalPrice;
    const images = [];
    $('img[itemprop="image"], .image-viewer img, .picture-wrapper img').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-src')) || clean($(el).attr('data-lazyload'));
      if (src && /^https?:/i.test(src)) images.push(src);
    });
    const idMatch = String(url).match(/(?:\/item\/|\/i\/)(\d+)/i);
    return {
      title,
      description: textOf($, '[itemprop="description"]') || fallback.description,
      brand: firstText(['[itemprop="brand"]', '.store-name'], $) || fallback.brand,
      category: fallback.category,
      sku: idMatch ? idMatch[1] : '',
      productId: idMatch ? idMatch[1] : '',
      price,
      originalPrice,
      currency: fallback.currency,
      availability: fallback.availability,
      seller: firstText(['.store-name', '.shop-name', '[data-pl="store-name"]'], $) || fallback.seller,
      images: uniqueImages([...images, ...jsonLdImages(jsonLdProducts($)[0] || {})]),
      variants: [],
      specifications: [],
      features: []
    };
  }
});
