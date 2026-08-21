import { clean, metaMap, ogImageList, jsonLdProducts, jsonLdImages, specificValues, parsePrice } from '../parser.js';
import { normalizePlatformImage } from '../normalize.js';

export { specificValues, normalizePlatformImage };

export function createAdapter({ id, label, match, extract }) {
  return { id, label, match, extract };
}

export function uniqueImages(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const url = clean(raw);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const key = url.replace(/^https?:/i, 'http:');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= 20) break;
  }
  return out;
}

export function offersFromLd(node) {
  if (!node) return {};
  const offers = node.offers;
  const single = Array.isArray(offers) ? offers[0] : offers;
  if (!single || typeof single !== 'object') return {};
  const price =
    single.price != null ? single.price : single.lowPrice != null ? single.lowPrice : single.highPrice != null ? single.highPrice : null;
  const priceCurrency = single.priceCurrency || node.priceCurrency || '';
  const availability = single.availability ? String(single.availability).split('/').pop() : '';
  return {
    price: typeof price === 'string' ? parsePrice(price) : price != null ? Number(price) : null,
    originalPrice: single.compareAtPrice != null ? (typeof single.compareAtPrice === 'string' ? parsePrice(single.compareAtPrice) : Number(single.compareAtPrice)) : null,
    currency: clean(priceCurrency),
    availability: availability ? clean(availability.replace(/_/g, ' ')) : '',
    seller: clean(single.seller && (typeof single.seller === 'string' ? single.seller : single.seller.name)),
    lowPrice: typeof single.lowPrice === 'string' ? parsePrice(single.lowPrice) : single.lowPrice != null ? Number(single.lowPrice) : null,
    highPrice: typeof single.highPrice === 'string' ? parsePrice(single.highPrice) : single.highPrice != null ? Number(single.highPrice) : null
  };
}

export function metaProduct($, meta = metaMap($)) {
  const ld = jsonLdProducts($);
  const primary = [...ld].sort((a, b) => productNodeScore(b) - productNodeScore(a))[0] || {};
  const offers = offersFromLd(primary);
  const ldImages = ld.flatMap((node) => jsonLdImages(node));
  const ogImages = ogImageList($, meta);
  const description = clean(primary.description || meta['og:description'] || meta['twitter:description'] || meta['description']);
  const brand = clean(
    (primary.brand && (typeof primary.brand === 'string' ? primary.brand : primary.brand.name)) ||
      meta['product:brand'] ||
      meta['og:brand']
  );
  const metaPrice = parsePrice(meta['product:price:amount'] || meta['og:price:amount'] || meta['product:sale_price:amount']);
  const metaOriginalPrice = parsePrice(meta['product:original_price:amount']);
  return {
    title: clean(primary.name || meta['og:title'] || meta['twitter:title'] || meta['title'] || meta['product:title']),
    description,
    brand,
    category: clean(primary.category || meta['product:category'] || meta['og:product:category']),
    sku: clean(primary.sku || meta['product:sku']),
    productId: clean(primary.productID || primary.asin || primary.sku || primary.mpn || meta['product:retailer_item_id']),
    price: offers.price != null ? offers.price : metaPrice,
    originalPrice: offers.originalPrice != null ? offers.originalPrice : metaOriginalPrice,
    currency: offers.currency || clean(meta['product:price:currency'] || meta['og:price:currency']),
    availability: offers.availability || clean(meta['product:availability']),
    seller: offers.seller,
    images: uniqueImages([...ldImages, ...ogImages]),
    variants: [],
    specifications: [],
    features: [],
    lowPrice: offers.lowPrice,
    highPrice: offers.highPrice
  };
}

function productNodeScore(node) {
  if (!node || typeof node !== 'object') return 0;
  return Number(Boolean(node.name)) * 3 + Number(Boolean(node.offers)) * 4 + Number(Boolean(node.image)) * 2 + Number(Boolean(node.sku || node.productID || node.asin)) * 3;
}

export function breadcrumbCategory($) {
  const crumbs = [];
  $('[itemprop="itemListElement"]').each((index, el) => {
    const $el = $(el);
    const name = clean($el.find('[itemprop="name"]').text() || $el.find('span').first().text());
    if (name) crumbs.push(name);
  });
  return crumbs.length > 1 ? crumbs[crumbs.length - 1] : '';
}

export function firstMeta($, names) {
  const meta = metaMap($);
  for (const name of names) {
    const value = meta[name.toLowerCase()];
    if (value) return clean(value);
  }
  return '';
}

export function normalizedImages(urls, platform) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const url = clean(raw);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const normalized = normalizePlatformImage(url, platform);
    const key = normalized.replace(/^https?:/i, 'http:').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= 20) break;
  }
  return out;
}
