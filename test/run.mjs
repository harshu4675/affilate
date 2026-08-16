import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { amazonAdapter } from '../server/extraction/adapters/amazon.js';
import { ebayAdapter } from '../server/extraction/adapters/ebay.js';
import { walmartAdapter } from '../server/extraction/adapters/walmart.js';
import { etsyAdapter } from '../server/extraction/adapters/etsy.js';
import { aliexpressAdapter } from '../server/extraction/adapters/aliexpress.js';
import { shopifyAdapter } from '../server/extraction/adapters/shopify.js';
import { genericAdapter } from '../server/extraction/adapters/generic.js';
import { normalizeProduct, analyzeCoverage } from '../server/extraction/normalize.js';
import { runExtraction } from '../server/extraction/pipeline.js';
import { detectPlatform } from '../server/extraction/detect.js';
import { normalizeUrl } from '../server/extraction/url.js';
import { fetchJson } from '../server/extraction/fetch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

const mock = spawn(process.execPath, [path.join(__dirname, 'mock-server.mjs')], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 700));

let failures = 0;
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function near(actual, expected) {
  return actual != null && Math.abs(actual - expected) < 0.001;
}

const amazon = amazonAdapter.extract({ html: fixtures('amazon.html'), url: 'https://www.amazon.com/dp/B0TEST1234?th=1&psc=1', platform: { id: 'amazon' } });
check('amazon: title', amazon.title === 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', amazon.title);
check('amazon: price', near(amazon.price, 348), String(amazon.price));
check('amazon: original price', near(amazon.originalPrice, 399.99), String(amazon.originalPrice));
check('amazon: brand', amazon.brand === 'Sony', amazon.brand);
check('amazon: availability', amazon.availability === 'In Stock', amazon.availability);
check('amazon: asin', amazon.productId === 'B0TEST1234', amazon.productId);
check('amazon: image count', amazon.images.length === 2, String(amazon.images.length));
check('amazon: image normalized', amazon.images[0].includes('_SL1500_') === false, amazon.images[0]);

const ebay = ebayAdapter.extract({ html: fixtures('ebay.html'), url: 'https://www.ebay.com/itm/123456789012', platform: { id: 'ebay' } });
check('ebay: title', ebay.title === 'Vintage Film Camera Bundle with Lenses', ebay.title);
check('ebay: price', near(ebay.price, 245), String(ebay.price));
check('ebay: original price', near(ebay.originalPrice, 299), String(ebay.originalPrice));
check('ebay: brand', ebay.brand === 'Nikon', ebay.brand);
check('ebay: seller', ebay.seller === 'mega-seller-2024', ebay.seller);
check('ebay: condition', ebay.condition === 'New (Other)', ebay.condition);
check('ebay: item id', ebay.productId === '123456789012', ebay.productId);
check('ebay: specs', ebay.specifications.length === 3, String(ebay.specifications.length));
check('ebay: images', ebay.images.length === 2, String(ebay.images.length));

const walmart = walmartAdapter.extract({ html: fixtures('walmart.html'), url: 'https://www.walmart.com/ip/IP6QT', platform: { id: 'walmart' } });
check('walmart: title', walmart.title === 'Instant Pot Duo 6 Qt 7-in-1', walmart.title);
check('walmart: price', near(walmart.price, 89.99), String(walmart.price));
check('walmart: brand', walmart.brand === 'Instant Pot', walmart.brand);
check('walmart: sku', walmart.sku === 'IP6QT', walmart.sku);
check('walmart: images', walmart.images.length >= 2, String(walmart.images.length));

const etsy = etsyAdapter.extract({ html: fixtures('etsy.html'), url: 'https://www.etsy.com/listing/987654321/handmade-ceramic-mug', platform: { id: 'etsy' } });
check('etsy: title', etsy.title === 'Handmade Ceramic Speckled Mug 350ml', etsy.title);
check('etsy: price', near(etsy.price, 28.5), String(etsy.price));
check('etsy: original price', near(etsy.originalPrice, 32), String(etsy.originalPrice));
check('etsy: seller', etsy.seller === 'CeramicStudioCo', etsy.seller);
check('etsy: listing id', etsy.productId === '987654321', etsy.productId);
check('etsy: images full size', etsy.images.some((img) => img.includes('il_fullxfull')), etsy.images.join(' '));

const ali = aliexpressAdapter.extract({ html: fixtures('aliexpress.html'), url: 'https://www.aliexpress.com/item/1005001234567890.html', platform: { id: 'aliexpress' } });
check('aliexpress: title', ali.title === 'Smart LED Strip Lights 5m RGB with Remote', ali.title);
check('aliexpress: price', near(ali.price, 9.99), String(ali.price));
check('aliexpress: original price', near(ali.originalPrice, 14.99), String(ali.originalPrice));
check('aliexpress: seller', ali.seller === 'LightingDeals Official', ali.seller);
check('aliexpress: images', ali.images.length === 2, String(ali.images.length));

const generic = genericAdapter.extract({ html: fixtures('generic.html'), url: 'https://store.example/products/aurora', platform: { id: 'generic' } });
check('generic: title', generic.title === 'Aurora Minimalist Desk Lamp', generic.title);
check('generic: price', near(generic.price, 54), String(generic.price));
check('generic: currency', generic.currency === 'EUR', generic.currency);
check('generic: brand', generic.brand === 'Modern Lighting', generic.brand);
check('generic: sku', generic.sku === 'ML-1001', generic.sku);
check('generic: seller', generic.seller === 'Modern Lighting Co.', generic.seller);
check('generic: image', generic.images.length === 1, String(generic.images.length));

const shopify = await shopifyAdapter.extract({
  url: 'http://127.0.0.1:8799/products/cloudpuff-blanket',
  platform: { id: 'shopify' },
  fetchJson: (url) => fetchJson(url)
});
check('shopify: title', shopify.title === 'CloudPuff Ultra Soft Blanket', shopify.title);
check('shopify: price', near(shopify.price, 39.99), String(shopify.price));
check('shopify: compare at', near(shopify.originalPrice, 49.99), String(shopify.originalPrice));
check('shopify: brand', shopify.brand === 'CloudPuff', shopify.brand);
check('shopify: variants', shopify.variants.length === 3, String(shopify.variants.length));
check('shopify: images absolute', shopify.images[0].startsWith('https:'), shopify.images[0]);

const normalized = normalizeProduct(amazon, { platform: 'amazon', url: 'https://www.amazon.com/dp/B0TEST1234', finalUrl: 'https://www.amazon.com/dp/B0TEST1234' });
const analysis = analyzeCoverage(normalized);
check('normalize: discount', normalized.discountPercent === 13, String(normalized.discountPercent));
check('normalize: coverage', analysis.coverage >= 85, String(analysis.coverage));
check('normalize: productLike', analysis.productLike === true);

const detection = detectPlatform('https://www.amazon.co.uk/dp/B0TEST');
check('detect: amazon.co.uk', detection.id === 'amazon', detection.id);
const detection2 = detectPlatform('https://shop.example/products/thing');
check('detect: shopify path', detection2.id === 'shopify', detection2.id);

const normUrl = normalizeUrl('https://www.Amazon.com/dp/B0TEST?utm_source=x&tag=aff-20&th=1');
check('url: normalized', normUrl.ok && normUrl.url === 'https://www.amazon.com/dp/B0TEST?th=1', normUrl.url);
const normUrl2 = normalizeUrl('example.com/product/123?utm_medium=cpc');
check('url: protocol added', normUrl2.ok && normUrl2.url.startsWith('https://'), normUrl2.url);

const badProtocol = await runExtraction({ url: 'ftp://example.com/file', allowLocal: true });
check('pipeline: unsupported protocol', badProtocol.ok === false && badProtocol.error.code === 'unsupported_platform', badProtocol.error && badProtocol.error.code);

const badUrl = await runExtraction({ url: 'not a url at all', allowLocal: true });
check('pipeline: invalid url', badUrl.ok === false && badUrl.error.code === 'invalid_url', badUrl.error && badUrl.error.code);

const localBlocked = await runExtraction({ url: 'http://127.0.0.1:8799/generic.html', allowLocal: false });
check('pipeline: localhost blocked in prod', localBlocked.ok === false && localBlocked.error.code === 'blocked_host', localBlocked.error && localBlocked.error.code);

const genericPipeline = await runExtraction({ url: 'http://127.0.0.1:8799/generic.html', allowLocal: true });
check('pipeline: generic ok', genericPipeline.ok === true, JSON.stringify(genericPipeline.error || {}).slice(0, 200));
if (genericPipeline.ok) {
  check('pipeline: generic platform', genericPipeline.data.source.platform === 'generic', genericPipeline.data.source.platform);
  check('pipeline: generic price', near(genericPipeline.data.product.price, 54), String(genericPipeline.data.product.price));
  check('pipeline: generic currency', genericPipeline.data.product.currency === 'EUR', genericPipeline.data.product.currency);
}

const shopifyPipeline = await runExtraction({ url: 'http://127.0.0.1:8799/products/cloudpuff-blanket', allowLocal: true });
check('pipeline: shopify ok', shopifyPipeline.ok === true, JSON.stringify(shopifyPipeline.error || {}).slice(0, 200));
if (shopifyPipeline.ok) {
  check('pipeline: shopify platform', shopifyPipeline.data.source.platform === 'shopify', shopifyPipeline.data.source.platform);
  check('pipeline: shopify title', shopifyPipeline.data.product.title === 'CloudPuff Ultra Soft Blanket', shopifyPipeline.data.product.title);
  check('pipeline: shopify variants', shopifyPipeline.data.product.variants.length === 3, String(shopifyPipeline.data.product.variants.length));
}

const blogPipeline = await runExtraction({ url: 'http://127.0.0.1:8799/blog.html', allowLocal: true });
check('pipeline: no product on blog', blogPipeline.ok === false && blogPipeline.error.code === 'no_product', blogPipeline.error && blogPipeline.error.code);

const partialPipeline = await runExtraction({ url: 'http://127.0.0.1:8799/amazon.html', allowLocal: true });
if (partialPipeline.ok) {
  check('pipeline: fixture via generic partial', partialPipeline.data.source.platform === 'generic', 'platform');
} else {
  check('pipeline: fixture via generic parse', false, 'expected success');
}

const localBlockedDev = await runExtraction({ url: 'http://127.0.0.1:8799/generic.html', allowLocal: false });
check('pipeline: private ip blocked when not dev', localBlockedDev.ok === false, localBlockedDev.error && localBlockedDev.error.code);

mock.kill('SIGTERM');

console.log('');
if (failures === 0) {
  console.log(`All ${checks.length} extraction checks passed.`);
  process.exit(0);
} else {
  console.error(`${failures} of ${checks.length} checks failed.`);
  process.exit(1);
}

