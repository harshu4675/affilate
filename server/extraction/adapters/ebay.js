import { createAdapter, metaProduct, uniqueImages, specificValues } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap } from '../parser.js';

export const ebayAdapter = createAdapter({
  id: 'ebay',
  label: 'eBay',
  match(host) {
    return host === 'ebay.com' || host === 'ebay.co.uk' || host === 'ebay.de' || host === 'ebay.fr' || host === 'ebay.it' || host === 'ebay.es' || host === 'ebay.ca' || host === 'ebay.com.au' || host === 'ebay.in' || host.endsWith('.ebay.com');
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = firstText(['h1.x-item-title__mainTitle', '#itemTitle', 'h1.it-ttl'], $) || fallback.title;
    const price = firstPrice(['#prcIsum', '.x-price-primary span', '.ux-price__primary', '.vi-price', '[itemprop="price"]'], $) ?? fallback.price;
    const originalPrice = firstPrice(['.x-price-secondary .ux-textspans--strikethrough', '.ux-price__strike', '#originalPrice', '.vi-price-strike'], $) ?? fallback.originalPrice;
    const brand = firstText(['#viTabs_0_is tr:has(.attrLabels:contains("Brand")) td', '.x-item-condition-text .ux-textspans--BOLD'], $) || fallback.brand;
    const seller = firstText(['#mbgLink', '.mbg-nick', '.x-sellercard-interactions .ux-textspans--BOLD'], $) || fallback.seller;
    const condition = firstText(['#vi-itm-cond', '.x-item-condition-text'], $) || fallback.condition;
    const itemId = String(url).match(/\/(?:itm|item)\/(\d+)/i);
    const images = [];
    $('.image-viewer img, #icImg, .ux-image-carousel img').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-src')) || clean($(el).attr('data-zoom-src'));
      if (src && /^https?:/i.test(src)) images.push(src);
    });
    return {
      title,
      description: textOf($, '#desc_div') || fallback.description,
      brand,
      category: fallback.category,
      sku: itemId ? itemId[1] : '',
      productId: itemId ? itemId[1] : '',
      price,
      originalPrice,
      currency: fallback.currency,
      availability: fallback.availability,
      condition,
      seller,
      images: uniqueImages(images),
      variants: [],
      specifications: specificValues($, '#viTabs_0_is'),
      features: []
    };
  }
});
