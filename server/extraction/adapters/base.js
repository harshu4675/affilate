import { clean, metaMap, ogImageList, jsonLdProducts, jsonLdImages, specificValues, parsePrice } from '../parser.js';

export { specificValues };

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
  const primary = ld[0] || {};
  const offers = offersFromLd(primary);
  const ldImages = jsonLdImages(primary);
  const ogImages = ogImageList($, meta);
  const description = clean(primary.description || meta['og:description'] || meta['description']);
  const brand = clean(
    primary.brand && (typeof primary.brand === 'string' ? primary.brand : primary.brand.name)
  );
  return {
    title: clean(primary.name || meta['og:title'] || meta['twitter:title'] || meta['title'] || meta['product:title']),
    description,
    brand,
    category: clean(primary.category || meta['product:category'] || meta['og:product:category']),
    sku: clean(primary.sku),
    productId: clean(primary.productID || primary.sku || primary.mpn),
    price: offers.price,
    originalPrice: offers.originalPrice,
    currency: offers.currency,
    availability: offers.availability,
    seller: offers.seller,
    images: uniqueImages([...ldImages, ...ogImages]),
    variants: [],
    specifications: [],
    features: [],
    lowPrice: offers.lowPrice,
    highPrice: offers.highPrice
  };
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
  return uniqueImages(urls).map((url) => normalizePlatformImage(url, platform));
}

function normalizePlatformImage(url, platform) {
  if (platform === 'amazon') {
    return url.replace(/\._[A-Z0-9_]+_[A-Z0-9]+_\./g, '.').replace(/\._AC_SL\d+_\./g, '.');
  }
  if (platform === 'etsy') {
    return url.replace(/__SX\d+__/g, '__').replace(/__SY\d+__/g, '__').replace(/il_([a-z0-9]+)x([a-z0-9]+)/i, 'il_fullxfull');
  }
  return url;
}
