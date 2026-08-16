import { createAdapter, metaProduct, normalizedImages } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap } from '../parser.js';

export const etsyAdapter = createAdapter({
  id: 'etsy',
  label: 'Etsy',
  match(host) {
    return host === 'etsy.com' || host.endsWith('.etsy.com');
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = firstText(['h1[data-buy-box-listing-title]', 'h1[itemprop="name"]', '#listing-page-cart h1'], $) || fallback.title;
    const price = firstPrice(['#listing-price .currency-value', '[data-buy-box-region="price"] .currency-value', '[itemprop="price"]'], $) ?? fallback.price;
    const originalPrice = firstPrice(['#listing-price .was-price .currency-value', 'p.was-price .currency-value', '[data-buy-box-region="price"] .was-price'], $) ?? fallback.originalPrice;
    const seller = firstText(['#listing-page-cart .seller-name', 'a[data-shop-name]', '#seller-tab .seller-name'], $) || fallback.seller;
    const images = [];
    $('#image-carousel-0 img, [data-carousel-pane] img, img[data-carousel-pane]').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-src')) || clean($(el).attr('data-full-size-image-url'));
      if (src && /^https?:/i.test(src)) images.push(src);
    });
    const listingId = String(url).match(/\/listing\/(\d+)/i);
    return {
      title,
      description: textOf($, '#description-text') || fallback.description,
      brand: fallback.brand,
      category: fallback.category,
      sku: listingId ? listingId[1] : '',
      productId: listingId ? listingId[1] : '',
      price,
      originalPrice,
      currency: fallback.currency,
      availability: fallback.availability,
      seller,
      images: normalizedImages(images, 'etsy'),
      variants: [],
      specifications: [],
      features: []
    };
  }
});
