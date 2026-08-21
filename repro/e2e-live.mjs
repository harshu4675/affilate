// Live end-to-end verification.
// Part A: live API extraction through the "generic" platform path (mock host).
// Part B: Amazon-adapter product (10 images) -> product factory -> live
//         catalog publish -> public product (all images) -> related products.
import { amazonAdapter } from '../server/extraction/adapters/amazon.js';
import { normalizeProduct } from '../server/extraction/normalize.js';
import { createProductFromExtraction } from '../src/state/productFactory.js';

const API = 'http://127.0.0.1:8787';
let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ` - ${detail}`}`);
  if (!cond) failures += 1;
};

// ---------------------------------------------------------------- Part A
console.log('--- Part A: live API extraction (generic platform path) ---');
const extRes = await fetch(`${API}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'http://127.0.0.1:8797/dp/B0CARGO123' })
});
const ext = await extRes.json();
check('extract ok', ext.ok, JSON.stringify(ext.error || {}));
check(
  'non-amazon host keeps its URLs untouched',
  ext.data.product.images.every((u) => u.startsWith('https://mock-amazon.local/')),
  ext.data.product.images.join(' ')
);

// ---------------------------------------------------------------- Part B
console.log('--- Part B: amazon product -> catalog -> public + related ---');
// Build the 10-image product exactly the way the Amazon pipeline produces it.
const html = await (await fetch('http://127.0.0.1:8797/dp/B0CARGO123')).text();
const raw = amazonAdapter.extract({
  html,
  url: 'https://www.amazon.com/dp/B0CARGO123',
  platform: { id: 'amazon', label: 'Amazon' }
});
const normalized = normalizeProduct(raw, {
  platform: 'amazon',
  url: 'https://www.amazon.com/dp/B0CARGO123',
  finalUrl: 'https://www.amazon.com/dp/B0CARGO123'
});
check('amazon pipeline: 10 images', normalized.images.length === 10, String(normalized.images.length));
check(
  'amazon pipeline: all originals, hero first',
  normalized.images[0] === 'https://mock-amazon.local/images/I/71cargo01.jpg' &&
    normalized.images.every((u) => !/\._[A-Z0-9_]+\./i.test(u)),
  normalized.images[0]
);

const extractionData = {
  product: normalized,
  source: {
    platform: 'amazon',
    platformLabel: 'Amazon',
    domain: 'www.amazon.com',
    url: 'https://www.amazon.com/dp/B0CARGO123',
    originalUrl: 'https://www.amazon.com/dp/B0CARGO123?tag=myaff-20',
    finalUrl: 'https://www.amazon.com/dp/B0CARGO123',
    extractedAt: new Date().toISOString(),
    missingFields: []
  }
};
const product = createProductFromExtraction(extractionData);
product.affiliateUrl = 'https://www.amazon.com/dp/B0CARGO123?tag=myaff-20';
check('factory: 10 image records, hero primary', product.images.length === 10 && product.images[0].isPrimary);

const twin = JSON.parse(JSON.stringify(product));
twin.id = 'prod_twin_e2e';
twin.title = `${product.title} - Black`;

// Admin login (capture cookie properly).
const loginRes = await fetch(`${API}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'talishh-admin' })
});
const loginBody = await loginRes.json().catch(() => null);
check('admin login ok', loginRes.ok && loginBody && loginBody.ok, JSON.stringify(loginBody || {}));
const cookie = (loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
check('session cookie set', cookie.length > 0, cookie);

const publishRes = await fetch(`${API}/api/admin/publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ products: [product, twin], mode: 'replace' })
});
const publish = await publishRes.json().catch(() => null);
check('publish ok', publish && publish.ok, JSON.stringify(publish || {}));

// Public product: ALL 10 images available (catalog cap was 6 before the fix).
const pubRes = await fetch(`${API}/api/products/${encodeURIComponent(product.id)}`);
const pub = await pubRes.json().catch(() => null);
check('public product fetch ok', pubRes.ok && pub && pub.ok, String(pubRes.status));
if (pub && pub.data) {
  check('public product has all 10 images', pub.data.product.images.length === 10, String(pub.data.product.images.length));
  check('hero image first in public gallery', pub.data.product.images[0].url === product.images[0].url);
  check('discount computed from real price data', pub.data.product.discountPercent === 38, String(pub.data.product.discountPercent));
  check('purchase url is the affiliate link', pub.data.product.hasPurchaseUrl === true);
}

// Related products: the twin matches (same category, title, price).
const relRes = await fetch(`${API}/api/products/${encodeURIComponent(product.id)}/related`);
const rel = await relRes.json().catch(() => null);
check(
  'related returns the twin (real data match)',
  rel && rel.ok && rel.data.related.some((item) => item.id === twin.id),
  JSON.stringify(rel && rel.data ? rel.data.related.map((i) => i.id) : {})
);
check('related excludes self', rel && rel.ok && !rel.data.related.some((item) => item.id === product.id));

console.log(failures === 0 ? '\nE2E: ALL PASSED' : `\nE2E: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
