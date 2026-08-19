import { loadHtml, clean, metaMap, ogImageList, jsonLdProducts, jsonLdImages, parsePrice, textOf, attrOf } from './parser.js';
import { offersFromLd, uniqueImages } from './adapters/base.js';

const SCALAR_FIELDS = [
  'title',
  'shortDescription',
  'description',
  'brand',
  'category',
  'subcategory',
  'sku',
  'productId',
  'currency',
  'price',
  'originalPrice',
  'availability',
  'condition',
  'seller'
];
const ARRAY_FIELDS = ['images', 'variants', 'specifications', 'features', 'tags'];

function valueName(value) {
  if (typeof value === 'string' || typeof value === 'number') return clean(value);
  if (!value || typeof value !== 'object') return '';
  return clean(value.name || value.value || value.title);
}

function nodeScore(node) {
  if (!node || typeof node !== 'object') return 0;
  let score = 0;
  if (node.name) score += 4;
  if (node.offers) score += 5;
  if (node.image) score += 3;
  if (node.sku || node.productID || node.mpn || node.gtin || node.asin) score += 4;
  if (node.description) score += 2;
  if (node.brand) score += 2;
  return score;
}

function productFromNode(node) {
  const offers = offersFromLd(node);
  const properties = Array.isArray(node.additionalProperty) ? node.additionalProperty : [];
  const specifications = properties
    .map((item) => ({ label: valueName(item && (item.name || item.propertyID)), value: valueName(item && item.value) }))
    .filter((item) => item.label && item.value);
  return {
    title: valueName(node.name || node.title),
    description: clean(node.description),
    brand: valueName(node.brand || node.manufacturer),
    category: valueName(node.category),
    sku: valueName(node.sku),
    productId: valueName(node.productID || node.asin || node.sku || node.mpn || node.gtin13 || node.gtin),
    price: offers.price,
    originalPrice: offers.originalPrice,
    currency: offers.currency,
    availability: offers.availability,
    condition: node.itemCondition ? clean(String(node.itemCondition).split('/').pop()) : '',
    seller: offers.seller,
    images: jsonLdImages(node),
    variants: [],
    specifications,
    features: Array.isArray(node.features) ? node.features : []
  };
}

function jsonLdLayer($) {
  const nodes = jsonLdProducts($).sort((a, b) => nodeScore(b) - nodeScore(a));
  if (!nodes.length) return { method: 'json-ld', product: {}, evidence: false };
  const products = nodes.map(productFromNode);
  return { method: 'json-ld', product: mergeRawProducts(products), evidence: true };
}

function openGraphLayer($) {
  const meta = metaMap($);
  const type = clean(meta['og:type']).toLowerCase();
  const price = parsePrice(
    meta['product:price:amount'] ||
      meta['og:price:amount'] ||
      meta['product:sale_price:amount'] ||
      meta['twitter:data1']
  );
  const originalPrice = parsePrice(meta['product:original_price:amount'] || meta['product:retailer_item_id:price']);
  const availability = clean(meta['product:availability'] || meta['og:availability']);
  const productId = clean(meta['product:retailer_item_id'] || meta['product:sku'] || meta['og:product_id']);
  const product = {
    title: clean(meta['og:title'] || meta['twitter:title']),
    description: clean(meta['og:description'] || meta['twitter:description']),
    brand: clean(meta['product:brand'] || meta['og:brand']),
    category: clean(meta['product:category'] || meta['og:product:category']),
    productId,
    sku: clean(meta['product:sku']),
    price,
    originalPrice,
    currency: clean(meta['product:price:currency'] || meta['og:price:currency'] || meta['product:sale_price:currency']),
    availability,
    condition: clean(meta['product:condition']),
    images: ogImageList($, meta)
  };
  const evidence = type.includes('product') || price != null || Boolean(productId || meta['product:price:amount']);
  return { method: 'open-graph', product, evidence };
}

function microdataLayer($) {
  const root = $('[itemscope][itemtype*="schema.org/Product" i], [itemtype*="schema.org/IndividualProduct" i]').first();
  if (!root.length) return { method: 'product-schema', product: {}, evidence: false };
  const read = (name, attr = 'content') => {
    const item = root.find(`[itemprop="${name}"]`).first();
    if (!item.length) return '';
    return clean(item.attr(attr) || item.attr('content') || item.attr('href') || item.attr('src') || item.text());
  };
  const images = [];
  root.find('[itemprop="image"]').each((index, element) => {
    const item = $(element);
    const value = clean(item.attr('content') || item.attr('href') || item.attr('src'));
    if (value) images.push(value);
  });
  const product = {
    title: read('name'),
    description: read('description'),
    brand: read('brand'),
    category: read('category'),
    sku: read('sku'),
    productId: read('productID') || read('mpn') || read('sku'),
    price: parsePrice(read('price')),
    originalPrice: parsePrice(read('highPrice')),
    currency: read('priceCurrency'),
    availability: read('availability').split('/').pop(),
    condition: read('itemCondition').split('/').pop(),
    seller: read('seller'),
    images
  };
  return { method: 'product-schema', product, evidence: true };
}

function htmlMetadataLayer($) {
  const meta = metaMap($);
  const canonical = attrOf($, 'link[rel="canonical"]', 'href');
  return {
    method: 'html-metadata',
    product: {
      title: clean(meta.title || $('title').first().text() || $('h1').first().text()),
      description: clean(meta.description),
      images: ogImageList($, meta),
      canonicalUrl: canonical
    },
    evidence: false
  };
}

function embeddedNodeScore(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return 0;
  const hasTitle = Boolean(node.title || node.name || node.productTitle);
  const hasPrice = node.price != null || node.salePrice != null || node.currentPrice != null || node.offers;
  const hasImage = Boolean(node.image || node.images || node.imageUrl || node.thumbnailUrl);
  const type = clean(node['@type'] || node.type || node.__typename).toLowerCase();
  let score = hasTitle ? 3 : 0;
  if (hasPrice) score += 4;
  if (hasImage) score += 2;
  if (type.includes('product')) score += 4;
  if (node.sku || node.productId || node.productID || node.asin) score += 3;
  return score;
}

function embeddedProduct(node) {
  const offer = node.offers && typeof node.offers === 'object' ? (Array.isArray(node.offers) ? node.offers[0] : node.offers) : {};
  const priceValue =
    node.price != null
      ? node.price
      : node.salePrice != null
        ? node.salePrice
        : node.currentPrice != null
          ? node.currentPrice
          : offer && (offer.price != null ? offer.price : offer.lowPrice);
  const originalValue = node.originalPrice != null ? node.originalPrice : node.compareAtPrice != null ? node.compareAtPrice : node.listPrice;
  const imageValue = node.images || node.image || node.imageUrl || node.thumbnailUrl;
  const images = [];
  const collectImage = (value) => {
    if (!value) return;
    if (typeof value === 'string') images.push(value);
    else if (Array.isArray(value)) value.forEach(collectImage);
    else if (typeof value === 'object') collectImage(value.url || value.src || value.original || value.large);
  };
  collectImage(imageValue);
  return {
    title: valueName(node.title || node.name || node.productTitle),
    description: clean(node.description || node.shortDescription),
    brand: valueName(node.brand || node.manufacturer),
    category: valueName(node.category || node.productType),
    sku: valueName(node.sku),
    productId: valueName(node.productId || node.productID || node.asin || node.sku || node.id),
    price: typeof priceValue === 'object' ? parsePrice(priceValue.value || priceValue.amount) : parsePrice(priceValue),
    originalPrice: typeof originalValue === 'object' ? parsePrice(originalValue.value || originalValue.amount) : parsePrice(originalValue),
    currency: clean(node.currency || node.currencyCode || (offer && offer.priceCurrency)),
    availability: valueName(node.availability || (offer && offer.availability)).split('/').pop(),
    seller: valueName(node.seller || (offer && offer.seller)),
    images
  };
}

function embeddedDataLayer($) {
  const candidates = [];
  let visited = 0;
  const walk = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 14 || visited > 16000) return;
    visited += 1;
    const score = embeddedNodeScore(node);
    if (score >= 7) candidates.push({ node, score });
    if (Array.isArray(node)) {
      for (const value of node) walk(value, depth + 1);
      return;
    }
    for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value, depth + 1);
  };
  $('script[type="application/json"], script#__NEXT_DATA__, script[data-state], script[type="application/ld+json"]').each((index, element) => {
    const raw = ($(element).html() || '').trim();
    if (!raw || raw.length > 2 * 1024 * 1024) return;
    try {
      walk(JSON.parse(raw), 0);
    } catch {
      return;
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 5).map((entry) => embeddedProduct(entry.node));
  return { method: 'embedded-data', product: mergeRawProducts(top), evidence: candidates.length > 0 };
}

function hasValue(value) {
  return value !== '' && value != null && (!Array.isArray(value) || value.length > 0);
}

export function mergeRawProducts(products) {
  const merged = {};
  for (const product of products || []) {
    if (!product || typeof product !== 'object') continue;
    for (const field of SCALAR_FIELDS) {
      if (!hasValue(merged[field]) && hasValue(product[field])) merged[field] = product[field];
    }
    for (const field of ARRAY_FIELDS) {
      const current = Array.isArray(merged[field]) ? merged[field] : [];
      const incoming = Array.isArray(product[field]) ? product[field] : [];
      if (field === 'images') merged[field] = uniqueImages([...current, ...incoming]);
      else if (incoming.length) merged[field] = [...current, ...incoming];
    }
  }
  return merged;
}

export async function extractInLayers({ html, url, platform, adapter, fetchJson }) {
  const $ = loadHtml(html);
  const layers = [];
  const structured = jsonLdLayer($);
  layers.push(structured);
  layers.push(openGraphLayer($));
  layers.push(microdataLayer($));

  let adapterProduct = {};
  try {
    adapterProduct = (await adapter.extract({ html, url, platform, fetchJson })) || {};
    layers.push({
      method: platform.id === 'generic' ? 'generic-selectors' : 'platform-selectors',
      product: adapterProduct,
      evidence: platform.id !== 'generic' || adapterProduct.price != null || Boolean(adapterProduct.productId)
    });
  } catch (error) {
    layers.push({ method: 'platform-selectors', product: {}, evidence: false, error: error && error.message ? error.message : 'adapter_failed' });
  }

  layers.push(embeddedDataLayer($));
  layers.push(htmlMetadataLayer($));
  const successful = layers.filter((layer) => Object.values(layer.product || {}).some(hasValue));
  const evidence = layers.some((layer) => layer.evidence && Object.values(layer.product || {}).some(hasValue));
  return {
    product: mergeRawProducts(successful.map((layer) => layer.product)),
    evidence,
    layers: layers.map((layer) => ({
      method: layer.method,
      successful: Object.values(layer.product || {}).some(hasValue),
      evidence: Boolean(layer.evidence),
      fields: Object.entries(layer.product || {})
        .filter(([, value]) => hasValue(value))
        .map(([field]) => field),
      error: layer.error || ''
    }))
  };
}
