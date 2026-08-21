/**
 * Storefront + admin UI test runner.
 *
 * Boots an isolated API (its own catalog file), seeds it through the REAL
 * extraction pipeline + product factory, then drives the actual React app in
 * jsdom. Nothing here touches the extraction logic itself.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

const API_PORT = Number(process.env.UI_TEST_API_PORT || 8791);
const MOCK_PORT = Number(process.env.UI_TEST_MOCK_PORT || 8798);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'talishh-uitest-'));

const children = [];
const stop = () => {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
};
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await wait(150);
  }
  return false;
}

function run(command, args, env) {
  const child = spawn(command, args, { cwd: root, stdio: 'ignore', env: { ...process.env, ...env } });
  children.push(child);
  return child;
}

// 1. Mock store (existing fixture server) + isolated API
run(process.execPath, [path.join(root, 'test', 'mock-server.mjs')], { MOCK_PORT: String(MOCK_PORT) });
run(process.execPath, [path.join(root, 'server', 'index.js')], {
  AFFILATE_DEV: '1',
  PORT: String(API_PORT),
  AFFILATE_DATA_DIR: dataDir,
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'talishh-admin',
  AFFILATE_SESSION_SECRET: 'ui-test-secret-value-0123456789'
});

if (!(await waitForServer(`http://127.0.0.1:${API_PORT}/api/health`))) {
  console.error('UI test: API did not start');
  process.exit(1);
}
if (!(await waitForServer(`http://127.0.0.1:${MOCK_PORT}/generic.html`))) {
  console.error('UI test: mock store did not start');
  process.exit(1);
}

// 2. Seed the catalog through the real extraction pipeline + product factory
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key)
};
const { runExtraction } = await import(path.join(root, 'server', 'extraction', 'pipeline.js'));
const { createProductFromExtraction } = await import(path.join(root, 'src', 'state', 'productFactory.js'));

const seeds = [];
for (const url of [
  `http://127.0.0.1:${MOCK_PORT}/generic.html`,
  `http://127.0.0.1:${MOCK_PORT}/products/cloudpuff-blanket`
]) {
  const result = await runExtraction({ url, allowLocal: true });
  if (!result.ok) {
    console.error('UI test: seed extraction failed for', url, result.error);
    process.exit(1);
  }
  const product = createProductFromExtraction(result.data);
  product.status = 'published';
  seeds.push(product);
}
seeds[0].affiliateUrl = 'https://example.com/aff?tag=talishh-21';
// A product with no usable link at all, to exercise the fallback/error path.
const noLink = JSON.parse(JSON.stringify(seeds[1]));
noLink.id = 'prod_nolink_test';
noLink.title = 'Product with no store link';
noLink.affiliateUrl = '';
noLink.source = { ...noLink.source, url: '', originalUrl: '', finalUrl: '' };
seeds.push(noLink);

const login = await fetch(`http://127.0.0.1:${API_PORT}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'talishh-admin' })
});
const cookie = (login.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
const publish = await fetch(`http://127.0.0.1:${API_PORT}/api/admin/publish`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ products: seeds, mode: 'replace' })
});
if (!publish.ok) {
  console.error('UI test: publish failed', await publish.text());
  process.exit(1);
}

// Related-products API: real matches only, never the product itself.
{
  const knownIds = new Set(seeds.map((seed) => seed.id));
  let relatedOk = true;
  let detail = '';
  for (const seed of seeds) {
    const res = await fetch(`http://127.0.0.1:${API_PORT}/api/products/${encodeURIComponent(seed.id)}/related`);
    const body = await res.json().catch(() => null);
    const related = body && body.ok && Array.isArray(body.data.related) ? body.data.related : null;
    if (!res.ok || !related) {
      relatedOk = false;
      detail = `${seed.id}: HTTP ${res.status}`;
      break;
    }
    if (related.some((item) => item.id === seed.id)) {
      relatedOk = false;
      detail = `${seed.id}: includes itself`;
      break;
    }
    if (related.some((item) => !knownIds.has(item.id))) {
      relatedOk = false;
      detail = `${seed.id}: unknown product ${related.map((item) => item.id).join(',')}`;
      break;
    }
  }
  console.log(relatedOk ? 'ok   related: real products only, never self' : `FAIL related: real products only - ${detail}`);
  if (!relatedOk) process.exit(1);

  // Aurora (generic) and CloudPuff (shopify) share a price range -> match.
  const auroraRelated = await (await fetch(`http://127.0.0.1:${API_PORT}/api/products/${encodeURIComponent(seeds[0].id)}/related`)).json();
  const matchesCloudPuff = auroraRelated.data.related.some((item) => item.id === seeds[1].id);
  console.log(matchesCloudPuff ? 'ok   related: price-range match found' : 'FAIL related: price-range match found');
  if (!matchesCloudPuff) process.exit(1);

  // Hidden products never surface in recommendations.
  await fetch(`http://127.0.0.1:${API_PORT}/api/admin/products/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ action: 'hide', ids: [seeds[1].id] })
  });
  const auroraRelatedHidden = await (await fetch(`http://127.0.0.1:${API_PORT}/api/products/${encodeURIComponent(seeds[0].id)}/related`)).json();
  const stillVisible = !auroraRelatedHidden.data.related.some((item) => item.id === seeds[1].id);
  console.log(stillVisible ? 'ok   related: hidden products excluded' : 'FAIL related: hidden products excluded');
  if (!stillVisible) process.exit(1);

  // Unknown id -> 404.
  const missing = await fetch(`http://127.0.0.1:${API_PORT}/api/products/prod_missing/related`);
  const missingOk = missing.status === 404;
  console.log(missingOk ? 'ok   related: unknown product is 404' : `FAIL related: unknown product is 404 - ${missing.status}`);
  if (!missingOk) process.exit(1);
  // Restore visibility for the DOM checks.
  await fetch(`http://127.0.0.1:${API_PORT}/api/admin/products/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ action: 'show', ids: [seeds[1].id] })
  });
}

// 3. Run the jsdom UI checks against this API
const test = spawn(process.execPath, [path.join(__dirname, 'storefront.dom.mjs')], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, UI_TEST_API: `http://127.0.0.1:${API_PORT}` }
});
let output = '';
test.stdout.on('data', (chunk) => {
  output += chunk;
});
test.stderr.on('data', (chunk) => {
  output += chunk;
});
const code = await new Promise((resolve) => test.on('close', resolve));

// React act() warnings are expected outside a test renderer; keep signal clean.
for (const line of output.split('\n')) {
  if (/^(ok |FAIL|---|All DOM|\d+ checks|\s+->)/.test(line)) console.log(line);
}
if (code !== 0 && output) {
  // On failure, show the tail of the raw output to make debugging easier.
  const tail = output.split('\n').slice(-25).join('\n');
  console.error('\n--- raw output tail ---\n' + tail);
}
stop();
process.exit(code);
