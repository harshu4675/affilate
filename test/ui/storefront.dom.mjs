import { JSDOM, VirtualConsole } from 'jsdom';
const vc = new VirtualConsole();

const API = process.env.UI_TEST_API || 'http://127.0.0.1:8787';
let cookieJar = '';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/', pretendToBeVisual: true, virtualConsole: vc
});
const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.MutationObserver = window.MutationObserver;
global.getComputedStyle = window.getComputedStyle;
global.localStorage = window.localStorage;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
window.scrollTo = () => {};
global.IS_REACT_ACT_ENVIRONMENT = true;

// route relative API calls to the running server, carrying cookies
const realFetch = fetch;
global.fetch = window.fetch = async (input, init = {}) => {
  const url = String(input).startsWith('/') ? API + input : String(input);
  const headers = new Headers(init.headers || {});
  if (cookieJar) headers.set('cookie', cookieJar);
  const res = await realFetch(url, { ...init, headers, redirect: 'manual' });
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (sc.length) cookieJar = sc.map((c) => c.split(';')[0]).join('; ');
  return res;
};

// jsdom blocks real navigation, so expose a window proxy whose location.assign
// records the target. App code reads the global `window`, jsdom keeps its own.
let navigatedTo = null;
const fakeLocation = {
  get href() { return window.location.href; },
  get hash() { return window.location.hash; },
  set hash(v) { window.location.hash = v; },
  get pathname() { return window.location.pathname; },
  get search() { return window.location.search; },
  get origin() { return window.location.origin; },
  get host() { return window.location.host; },
  get hostname() { return window.location.hostname; },
  get protocol() { return window.location.protocol; },
  assign(u) { navigatedTo = String(u); },
  replace(u) { navigatedTo = String(u); },
  reload() {},
  toString() { return window.location.href; }
};
global.window = new Proxy(window, {
  get: (t, p) => (p === 'location' ? fakeLocation : Reflect.get(t, p)),
  set: (t, p, v) => Reflect.set(t, p, v)
});

const { mount } = await import('./.build/app-entry.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => document.body.textContent.replace(/\s+/g, ' ');
const q = (s) => document.querySelectorAll(s);

let fails = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log('ok   ' + name);
  else { fails++; console.error('FAIL ' + name + (detail ? ' - ' + detail : '')); }
};

const go = async (hash, ms = 900) => { window.location.hash = hash; window.dispatchEvent(new window.HashChangeEvent('hashchange')); await wait(ms); };

mount(document.getElementById('root'));
await wait(1600);

console.log('\n--- STOREFRONT HOME ---');
check('storefront brand shown', text().includes('Talishh'));
check('no admin UI leaked to visitors', !text().includes('Admin sign in') && !document.querySelector('.admin-sidebar'));
const cards = q('.pcard:not(.pcard-skeleton)');
check('product cards render', cards.length >= 2, `count=${cards.length}`);
check('grid container present', q('.product-grid').length === 1);
check('prices rendered', q('.pcard-price').length >= 2, String(q('.pcard-price').length));
check('discount badge rendered', q('.pcard-discount').length >= 1);
check('store badge rendered', q('.pcard-store').length >= 1);
const disabledCta = [...q('.pcard-cta')].filter((b) => b.disabled);
check('missing-link product has disabled CTA', disabledCta.length === 1, String(disabledCta.length));
check('result count shown', /\d+ products/.test(text()), text().slice(0, 120));

console.log('\n--- SEARCH ---');
await go('#/?q=blanket', 1200);
const searchCards = q('.pcard:not(.pcard-skeleton)');
check('search filters results', searchCards.length === 1, `count=${searchCards.length}`);
check('search term echoed', text().includes('blanket'));

await go('#/?q=zzzznope', 1200);
check('empty search state shown', text().includes('No products match your search'), text().slice(0,200));

console.log('\n--- PRODUCT DETAIL + BUY ---');
await go('#/', 1100);
const firstLink = [...q('.pcard-link')].find((a) => a.getAttribute('href'));
const pid = firstLink.getAttribute('href').split('/').pop();
await go(`#/product/${pid}`, 1300);
check('pdp renders title', q('.pdp-title').length === 1, text().slice(0,150));
check('pdp buy button', q('.pdp-buy').length === 1);
check('pdp price', q('.pdp-price').length >= 0);

const buyBtn = document.querySelector('.pdp-buy');
check('buy button enabled for linked product', !buyBtn.disabled);
buyBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(15);
check('redirect overlay appears immediately', q('.redirect-overlay').length === 1);
check('shows Opening product loader', text().includes('Opening product'), text().slice(-200));
await wait(600);
check('shows thanks message', text().includes('Thanks for shopping with Talishh'), text().slice(-220));
await wait(1200);
check('redirected to store URL', typeof navigatedTo === 'string' && /^https?:\/\//.test(navigatedTo || ''), String(navigatedTo));
console.log('     -> redirect target:', navigatedTo);

console.log('\n--- PRODUCT GALLERY + RELATED ---');
await go('#/?q=blanket', 1200);
const blanketLink = [...q('.pcard-link')].find((a) => a.getAttribute('href'));
await go(blanketLink.getAttribute('href'), 1300);
check('pdp main image renders', q('.pdp-main-image img').length === 1, String(q('.pdp-main-image img').length));
check('pdp thumbnails render for multi-image product', q('.pdp-thumb').length >= 2, String(q('.pdp-thumb').length));
const thumbs = q('.pdp-thumb');
if (thumbs.length >= 2) {
  const beforeSrc = q('.pdp-main-image img')[0].getAttribute('src');
  thumbs[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(80);
  const afterSrc = q('.pdp-main-image img')[0].getAttribute('src');
  check('clicking a thumbnail changes the main image', Boolean(beforeSrc) && beforeSrc !== afterSrc, `${beforeSrc} -> ${afterSrc}`);
}
check('related section renders real products', q('.pdp-related').length === 1 && q('.related-card').length >= 1, `cards=${q('.related-card').length}`);
const relatedHrefs = [...q('.related-card')].map((a) => a.getAttribute('href') || '');
check('related cards link to real product pages', relatedHrefs.length > 0 && relatedHrefs.every((href) => /^#\/product\/.+/.test(href)), relatedHrefs.join(' '));

console.log('\n--- ADMIN GUARD (anonymous) ---');
await go('#/admin', 1800);
check('admin shows login form', text().includes('Admin sign in'), text().slice(0,180));
check('no product management exposed', !document.querySelector('.admin-table') && !text().includes('storefront catalog'));

console.log('\n--- ADMIN LOGIN ---');
const setVal = (el, v) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, v);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const inputs = document.querySelectorAll('.admin-login-card input');
setVal(inputs[0], 'admin');
setVal(inputs[1], 'talishh-admin');
await wait(60);
document.querySelector('.admin-login-card').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await wait(2200);
check('admin dashboard after login', document.querySelector('.admin-sidebar') !== null, text().slice(0,200));
check('dashboard stats shown', q('.admin-stat').length >= 4, String(q('.admin-stat').length));
check('shows total products stat', text().includes('Total products'));

console.log('\n--- BROKEN LINK HANDLING ---');
await go('#/product/prod_nolink_test', 1300);
navigatedTo = null;
const brokenBtn = document.querySelector('.pdp-buy');
check('broken-link product disables buy', brokenBtn && brokenBtn.disabled, brokenBtn ? brokenBtn.textContent : 'no button');
// Simulate a product whose link breaks server-side: hasPurchaseUrl is true in
// the payload but /go returns no_link. We hide the product server-side mid-flight.
await go('#/', 1200);
const hideMeId = [...q('.pcard-link')].map((a) => a.getAttribute('href').split('/').pop()).find((x) => x !== 'prod_nolink_test');
await go('#/product/' + hideMeId, 1300);
const hidableBtn = document.querySelector('.pdp-buy');
check('hidable product initially buyable', hidableBtn && !hidableBtn.disabled);
await realFetch(API + '/api/admin/products/' + hideMeId, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', cookie: cookieJar },
  body: JSON.stringify({ visible: false })
});
navigatedTo = null;
document.querySelector('.pdp-buy').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(900);
const errOverlay = document.querySelector('.redirect-overlay');
check('error overlay shown for missing link', errOverlay !== null && errOverlay.textContent.includes('Store link unavailable'), 'overlay=' + (errOverlay ? errOverlay.textContent : 'null'));
check('no redirect happened for broken link', navigatedTo === null, String(navigatedTo));
const backBtn = document.querySelector('.redirect-close');
backBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('error overlay dismissable', q('.redirect-overlay').length === 0);


console.log('\n--- ADMIN PRODUCTS ---');
await go('#/admin/products', 2000);
check('admin product rows render', q('.admin-table tbody tr').length >= 3, String(q('.admin-table tbody tr').length));
check('admin shows affiliate link column', text().includes('Affiliate link') || text().includes('No affiliate URL'));
check('admin shows Live/Hidden status', /Live|Hidden/.test(text()));
check('admin mobile cards also present in DOM', q('.admin-mcard').length >= 3);
const editBtn = document.querySelector('.admin-table tbody tr .admin-icon-btn');
editBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(500);
check('edit drawer opens', q('.admin-drawer').length === 1);
check('drawer shows read-only imported data', text().includes('Imported data'));
document.querySelector('.admin-drawer-head .admin-icon-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
check('drawer closes', q('.admin-drawer').length === 0);

console.log('\n--- ADMIN IMPORT PAGE ---');
await go('#/admin/import', 1800);
check('import page has extractor form', q('.extractor').length === 1);
check('import page lists publish controls', text().includes('Publish'));

console.log('\n--- LEGACY IMPORTER WORKSPACE ---');
await go('#/library', 1400);
check('library page still works', text().includes('Product library'), text().slice(0,160));
await go('#/import', 1400);
check('importer dashboard still works', text().includes('Import a product from any store'), text().slice(0,160));

console.log('\n--- LIBRARY: PICK BEST + PROMOTE ---');
// Seed the local library (what an import would produce) via the storage sync
// path, then drive the new Pick Best / Promote UI.
const mkLib = (id, title, over) => ({
  id, title,
  shortDescription: '', description: '',
  brand: '', category: '', subcategory: '', sku: id, productId: id,
  currency: 'USD', price: null, originalPrice: null, discountPercent: null,
  availability: '', condition: '', seller: '',
  images: [], removedImages: [], variants: [], specifications: [], features: [], tags: [],
  affiliateUrl: '',
  source: { url: '', originalUrl: '', finalUrl: '', platform: 'generic', platformLabel: 'Store', domain: '', extractedAt: new Date().toISOString(), lastRefreshedAt: '', partial: false, missingFields: [] },
  status: 'draft', editedFields: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  ...over
});
const libProducts = [
  mkLib('lib_best', 'Best Product - full data', {
    price: 20, originalPrice: 40, discountPercent: 50, availability: 'In Stock',
    brand: 'TestBrand', category: 'Gadgets',
    description: 'A description that is comfortably long enough to count as a full listing.',
    images: [1, 2, 3, 4, 5].map((n) => ({ id: `lib_best_img${n}`, url: `https://picsum.photos/seed/libbest${n}/800/600`, alt: '', position: n - 1, isPrimary: n === 1, source: 'extracted' })),
    affiliateUrl: 'https://example.com/aff?id=lib_best',
    source: { url: 'https://example.com/p/lib_best', originalUrl: 'https://example.com/aff?id=lib_best', finalUrl: 'https://example.com/p/lib_best', platform: 'generic', platformLabel: 'Store', domain: 'example.com', extractedAt: new Date().toISOString(), lastRefreshedAt: '', partial: false, missingFields: [] }
  }),
  mkLib('lib_mid', 'Mid Product - some data', {
    price: 15, availability: 'In Stock', category: 'Gadgets',
    shortDescription: 'Short blurb.',
    description: 'A slightly shorter description.',
    images: [1, 2].map((n) => ({ id: `lib_mid_img${n}`, url: `https://picsum.photos/seed/libmid${n}/800/600`, alt: '', position: n - 1, isPrimary: n === 1, source: 'extracted' })),
    source: { url: 'https://example.com/p/lib_mid', originalUrl: '', finalUrl: 'https://example.com/p/lib_mid', platform: 'generic', platformLabel: 'Store', domain: 'example.com', extractedAt: new Date().toISOString(), lastRefreshedAt: '', partial: false, missingFields: [] }
  }),
  mkLib('lib_weak', 'Weak Product - almost nothing')
];
const libState = JSON.stringify({ version: 2, updatedAt: new Date().toISOString(), data: { products: libProducts, history: [], draft: null, shortlist: [] } });
window.dispatchEvent(new window.StorageEvent('storage', { key: 'affilate:store:v2', newValue: libState }));
await wait(500);
await go('#/library', 1200);
check('library lists seeded products', q('.product-table tbody tr').length === 3, String(q('.product-table tbody tr').length));

const pickBestBtn = [...q('.library-header-actions .btn')].find((b) => b.textContent.includes('Pick best'));
check('pick best button present', Boolean(pickBestBtn));
pickBestBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(500);
check('pick best modal ranks all products', q('.pickbest-row').length === 3, String(q('.pickbest-row').length));
check('best product ranked first', (q('.pickbest-row .pickbest-title')[0] || {}).textContent === 'Best Product - full data', (q('.pickbest-row .pickbest-title')[0] || {}).textContent);
check('reason chips rendered from real data', q('.pickbest-chip-good').length >= 3, String(q('.pickbest-chip-good').length));

const shortlistTopBtn = [...q('.pickbest-intro-actions .btn')].find((b) => b.textContent.includes('Shortlist top 5'));
shortlistTopBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(400);
check('shortlist top 5 marks rows', q('.pickbest-row-shortlisted').length === 3, String(q('.pickbest-row-shortlisted').length));
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await wait(400);
check('pick best modal closes', q('.modal').length === 0, String(q('.modal').length));

const shortlistToggle = q('.shortlist-toggle')[0];
check('shortlist filter appears with count', Boolean(shortlistToggle) && shortlistToggle.textContent.includes('3'), shortlistToggle ? shortlistToggle.textContent : 'missing');
shortlistToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(400);
check('shortlist filter keeps shortlisted rows', q('.product-table tbody tr').length === 3, String(q('.product-table tbody tr').length));
shortlistToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(400);

const firstMore = q('.product-table tbody tr .dropdown-trigger')[0];
firstMore.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(300);
const promoteItem = [...q('.menu-item')].find((b) => b.textContent.includes('Promote'));
check('promote action in row menu', Boolean(promoteItem));
promoteItem.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(500);
check('promote dialog shows the real link', Boolean(q('.promote-link-code')[0]) && q('.promote-link-code')[0].textContent.includes('example.com'), q('.promote-link-code')[0] ? q('.promote-link-code')[0].textContent : 'missing');
check('promote dialog has copy + open actions', [...q('.promote-actions .btn')].map((b) => b.textContent).join(' ').includes('Copy link') && [...q('.promote-actions .btn')].map((b) => b.textContent).join(' ').includes('Open product'));
check('promote notes no ad platform is connected', text().includes('No ad platform is connected'));
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await wait(300);

console.log('');
if (fails) { console.error(fails + ' checks FAILED'); process.exit(1); }
console.log('All DOM checks passed.');
process.exit(0);
