import { createAdapter, metaProduct, uniqueImages, breadcrumbCategory } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap, jsonLdProducts, jsonLdImages } from '../parser.js';

export const walmartAdapter = createAdapter({
  id: 'walmart',
  label: 'Walmart',
  match(host) {
    return host === 'walmart.com' || host.endsWith('.walmart.com');
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = firstText(['h1[itemprop="name"]', 'h1.prod-ProductTitle', '[data-testid="product-title"]'], $) || fallback.title;
    const price = firstPrice(['[itemprop="price"]', 'span[itemprop="price"]', '.price-now span', '[data-automation-id="product-price"]'], $) ?? fallback.price;
    const originalPrice = firstPrice(['.price-was span', 's[itemprop="price"]', '[data-automation-id="was-price"]'], $) ?? fallback.originalPrice;
    const brand = firstText(['[itemprop="brand"]', '.prod-brandName'], $) || fallback.brand;
    const images = [];
    $('img[itemprop="image"], img[data-testid="product-hero-image"]').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-src'));
      if (src) images.push(src);
    });
    const walmartImages = [];
    $('img').each((index, el) => {
      const src = clean($(el).attr('src')) || '';
      if (src.includes('i5.walmartimages.com') && walmartImages.length < 12) walmartImages.push(src);
    });
    const ld = jsonLdProducts($)[0] || {};
    const idMatch = String(url).match(/\/(?:ip|product)\/([A-Z0-9]+)/i);
    return {
      title,
      description: textOf($, '[itemprop="description"]') || fallback.description,
      brand,
      category: fallback.category || breadcrumbCategory($),
      sku: idMatch ? idMatch[1] : clean(ld.sku),
      productId: idMatch ? idMatch[1] : clean(ld.sku || ld.productID),
      price,
      originalPrice,
      currency: fallback.currency,
      availability: fallback.availability,
      seller: fallback.seller,
      images: uniqueImages([...walmartImages, ...jsonLdImages(ld), ...images]),
      variants: [],
      specifications: [],
      features: []
    };
  }
});
