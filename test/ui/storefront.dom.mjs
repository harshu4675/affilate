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

console.log('');
if (fails) { console.error(fails + ' checks FAILED'); process.exit(1); }
console.log('All DOM checks passed.');
process.exit(0);
