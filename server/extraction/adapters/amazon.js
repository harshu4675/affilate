import { createAdapter, metaProduct, normalizedImages, breadcrumbCategory } from './base.js';
import { loadHtml, clean, textOf, firstText, firstPrice, metaMap, jsonLdProducts, jsonLdImages } from '../parser.js';

const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.ca',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.nl',
  'amazon.in',
  'amazon.com.au',
  'amazon.com.br',
  'amazon.com.mx',
  'amazon.ae',
  'amazon.sg',
  'amazon.co.jp',
  'amazon.pl',
  'amazon.se',
  'amazon.com.tr',
  'amazon.eg'
];

export const amazonAdapter = createAdapter({
  id: 'amazon',
  label: 'Amazon',
  match(host) {
    return AMAZON_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  },
  extract({ html, url }) {
    const $ = loadHtml(html);
    const meta = metaMap($);
    const fallback = metaProduct($, meta);
    const title = textOf($, '#productTitle') || fallback.title;
    const price = firstPrice(['.priceToPay span.a-offscreen', '#corePriceDisplay_desktop_feature_div span.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', 'span.a-price span.a-offscreen'], $) ?? fallback.price;
    const originalPrice =
      firstPrice(['span.basisPrice span.a-offscreen', '.a-price.a-text-price span.a-offscreen', '#corePrice_feature_div .a-text-price .a-offscreen', '.priceBlockStrikePriceString'], $) ??
      fallback.originalPrice;
    const bylineBrand = firstText(['#bylineInfo', '.po-brand .po-break-word', '#productOverview_feature_div tr:has(th:contains("Brand")) td'], $)
      .replace(/^visit the\s+/i, '')
      .replace(/\s+store$/i, '')
      .trim();
    const brand = fallback.brand || bylineBrand;
    const availability = firstText(['#availability span', '#availability .a-declarative .a-size-medium'], $) || fallback.availability;
    const asin = String(url).match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    const images = [];
    $('#altImages img').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-old-hires'));
      if (src && src.includes('media-amazon.com')) images.push(src);
    });
    $('#landingImage').each((index, el) => {
      const src = clean($(el).attr('src')) || clean($(el).attr('data-old-hires'));
      if (src) images.push(src);
    });
    const ldImages = jsonLdImages(jsonLdProducts($)[0] || {});
    const description =
      textOf($, '#productDescription') ||
      textOf($, '#feature-bullets ul') ||
      fallback.description;
    const seller = firstText(['#sellerProfileTriggerId', '#merchantInfoFeature_feature_div .offer-display-feature-text', '.tabular-buybox-text-message'], $) || '';
    return {
      title,
      description,
      brand,
      category: fallback.category || breadcrumbCategory($),
      sku: asin ? asin[1] : '',
      productId: asin ? asin[1] : '',
      price,
      originalPrice,
      currency: fallback.currency || 'USD',
      availability: availability || fallback.availability,
      seller,
      images: normalizedImages([...images, ...ldImages], 'amazon'),
      variants: [],
      specifications: [],
      features: []
    };
  }
});
