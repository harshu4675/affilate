import express from 'express';
import {
  adminCredentials,
  clearSessionCookie,
  createSessionToken,
  getSession,
  requireAdmin,
  setSessionCookie,
  verifyCredentials
} from '../auth.js';
import { catalogInfo, getProduct, listProducts, removeProducts, saveProducts, upsertProduct } from './store.js';
import { ADMIN_EDITABLE_FIELDS, applyAdminPatch, buildCatalogRecord, resolvePurchaseUrl, toPublicProduct } from './model.js';

function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

function sortProducts(list, sort) {
  const sorters = {
    newest: (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
    oldest: (a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0),
    price_asc: (a, b) => (a.price == null ? Infinity : a.price) - (b.price == null ? Infinity : b.price),
    price_desc: (a, b) => (b.price == null ? -Infinity : b.price) - (a.price == null ? -Infinity : a.price),
    discount: (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0),
    alpha: (a, b) => (a.title || '').localeCompare(b.title || '')
  };
  return [...list].sort(sorters[sort] || sorters.newest);
}

function matchesQuery(product, needle) {
  if (!needle) return true;
  const haystack = [
    product.title,
    product.brand,
    product.category,
    product.subcategory,
    product.seller,
    product.source && product.source.platformLabel,
    ...(product.tags || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function createCatalogRouter({ loginLimiter } = {}) {
  const router = express.Router();

  // ---------------------------------------------------------------- public

  router.get('/products', (req, res) => {
    const all = listProducts().filter((item) => item.visible !== false);
    const needle = String(req.query.q || '').trim().toLowerCase();
    const store = String(req.query.store || '').trim();
    const category = String(req.query.category || '').trim();
    const minPrice = req.query.minPrice != null && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice != null && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;
    const sort = String(req.query.sort || 'newest');
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 60);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let filtered = all.filter((item) => matchesQuery(item, needle));
    if (store) filtered = filtered.filter((item) => item.source && item.source.platform === store);
    if (category) filtered = filtered.filter((item) => (item.category || '').toLowerCase() === category.toLowerCase());
    if (Number.isFinite(minPrice)) filtered = filtered.filter((item) => item.price != null && item.price >= minPrice);
    if (Number.isFinite(maxPrice)) filtered = filtered.filter((item) => item.price != null && item.price <= maxPrice);

    const sorted = sortProducts(filtered, sort);
    const page = sorted.slice(offset, offset + limit);

    const stores = new Map();
    const categories = new Map();
    for (const item of all) {
      const platform = (item.source && item.source.platform) || 'generic';
      const label = (item.source && item.source.platformLabel) || 'Store';
      if (!stores.has(platform)) stores.set(platform, { id: platform, label, count: 0 });
      stores.get(platform).count += 1;
      if (item.category) {
        const key = item.category;
        if (!categories.has(key)) categories.set(key, { id: key, label: key, count: 0 });
        categories.get(key).count += 1;
      }
    }

    return res.json({
      ok: true,
      data: {
        products: page.map(toPublicProduct),
        total: sorted.length,
        catalogTotal: all.length,
        offset,
        limit,
        hasMore: offset + page.length < sorted.length,
        facets: {
          stores: [...stores.values()].sort((a, b) => b.count - a.count),
          categories: [...categories.values()].sort((a, b) => b.count - a.count).slice(0, 40)
        }
      }
    });
  });

  router.get('/products/:id', (req, res) => {
    const record = getProduct(req.params.id);
    if (!record || record.visible === false) return fail(res, 404, 'not_found', 'This product is not available.');
    return res.json({ ok: true, data: { product: toPublicProduct(record) } });
  });

  router.get('/products/:id/go', (req, res) => {
    const record = getProduct(req.params.id);
    if (!record || record.visible === false) return fail(res, 404, 'not_found', 'This product is not available.');
    const url = resolvePurchaseUrl(record);
    if (!url) return fail(res, 409, 'no_link', 'This product has no store link yet.');
    return res.json({ ok: true, data: { url, store: record.source ? record.source.platformLabel : 'the store' } });
  });

  // ----------------------------------------------------------------- admin

  router.post('/admin/login', (req, res) => {
    if (loginLimiter) {
      const limit = loginLimiter(req.ip || 'unknown');
      if (limit.limited) {
        res.set('retry-after', String(Math.ceil(limit.retryAfterMs / 1000)));
        return fail(res, 429, 'rate_limited', 'Too many sign in attempts. Please wait a moment.');
      }
    }
    const { username, password } = req.body || {};
    if (!verifyCredentials(username, password)) {
      return fail(res, 401, 'invalid_credentials', 'Incorrect username or password.');
    }
    const token = createSessionToken(String(username));
    setSessionCookie(req, res, token);
    return res.json({ ok: true, data: { username: String(username) } });
  });

  router.post('/admin/logout', (req, res) => {
    clearSessionCookie(req, res);
    return res.json({ ok: true });
  });

  router.get('/admin/session', (req, res) => {
    const session = getSession(req);
    const creds = adminCredentials();
    return res.json({
      ok: true,
      data: {
        authenticated: Boolean(session),
        username: session ? session.username : null,
        usingDefaultPassword: creds.usingDefaults
      }
    });
  });

  router.get('/admin/products', requireAdmin, (req, res) => {
    const products = listProducts();
    const info = catalogInfo();
    const visible = products.filter((item) => item.visible !== false);
    const withPrice = products.filter((item) => item.price != null);
    const withLink = products.filter((item) => Boolean(resolvePurchaseUrl(item)));
    const stores = new Set(products.map((item) => (item.source && item.source.platform) || 'generic'));
    return res.json({
      ok: true,
      data: {
        products,
        stats: {
          total: products.length,
          visible: visible.length,
          hidden: products.length - visible.length,
          missingLink: products.length - withLink.length,
          missingPrice: products.length - withPrice.length,
          missingImage: products.filter((item) => !item.images || item.images.length === 0).length,
          stores: stores.size,
          averagePrice:
            withPrice.length > 0
              ? Math.round((withPrice.reduce((sum, item) => sum + item.price, 0) / withPrice.length) * 100) / 100
              : null,
          lastPublishedAt: info.updatedAt
        },
        storage: { writable: info.writable }
      }
    });
  });

  /**
   * Publish products from the admin's local library into the storefront catalog.
   * The payload is produced by the existing import pipeline; this endpoint only
   * projects it into the public catalog shape.
   */
  router.post('/admin/publish', requireAdmin, (req, res) => {
    const incoming = req.body && Array.isArray(req.body.products) ? req.body.products : null;
    if (!incoming) return fail(res, 400, 'invalid_payload', 'A products array is required.');
    if (incoming.length > 1000) return fail(res, 413, 'too_large', 'Too many products in one publish request.');

    const mode = req.body.mode === 'replace' ? 'replace' : 'merge';
    const force = req.body.force === true;
    const existing = new Map(listProducts().map((item) => [item.id, item]));

    const built = [];
    for (const product of incoming) {
      const record = buildCatalogRecord(product, existing.get(String(product && product.id)) || null, { force });
      if (record) built.push(record);
    }

    let next;
    if (mode === 'replace') {
      next = built;
    } else {
      const byId = new Map(existing);
      for (const record of built) byId.set(record.id, record);
      next = [...byId.values()];
    }
    next.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const saved = saveProducts(next, mode === 'replace' ? [] : undefined);
    if (!saved.ok) return fail(res, 500, saved.code || 'storage_unavailable', saved.message || 'Catalog could not be saved.');
    return res.json({ ok: true, data: { published: built.length, total: next.length, mode } });
  });

  router.patch('/admin/products/:id', requireAdmin, (req, res) => {
    const record = getProduct(req.params.id);
    if (!record) return fail(res, 404, 'not_found', 'Product not found in the catalog.');
    const patch = req.body && typeof req.body === 'object' ? req.body : {};
    const known = [...ADMIN_EDITABLE_FIELDS, 'visible'];
    if (!Object.keys(patch).some((key) => known.includes(key))) {
      return fail(res, 400, 'invalid_payload', 'No editable fields were provided.');
    }
    const next = applyAdminPatch(record, patch);
    const saved = upsertProduct(next);
    if (!saved.ok) return fail(res, 500, saved.code || 'storage_unavailable', saved.message || 'Product could not be saved.');
    return res.json({ ok: true, data: { product: next } });
  });

  router.delete('/admin/products/:id', requireAdmin, (req, res) => {
    const record = getProduct(req.params.id);
    if (!record) return fail(res, 404, 'not_found', 'Product not found in the catalog.');
    const removed = removeProducts([req.params.id]);
    if (!removed.ok) return fail(res, 500, removed.code || 'storage_unavailable', removed.message || 'Product could not be removed.');
    return res.json({ ok: true, data: { removed: removed.removed } });
  });

  router.post('/admin/products/bulk', requireAdmin, (req, res) => {
    const ids = req.body && Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const action = req.body && req.body.action;
    if (ids.length === 0) return fail(res, 400, 'invalid_payload', 'No products were selected.');

    if (action === 'delete') {
      const removed = removeProducts(ids);
      if (!removed.ok) return fail(res, 500, 'storage_unavailable', removed.message || 'Products could not be removed.');
      return res.json({ ok: true, data: { removed: removed.removed } });
    }

    if (action === 'show' || action === 'hide') {
      const idSet = new Set(ids);
      const visible = action === 'show';
      const now = new Date().toISOString();
      const products = listProducts().map((item) => (idSet.has(item.id) ? { ...item, visible, updatedAt: now } : item));
      const saved = saveProducts(products);
      if (!saved.ok) return fail(res, 500, 'storage_unavailable', saved.message || 'Products could not be updated.');
      return res.json({ ok: true, data: { updated: ids.length, visible } });
    }

    return fail(res, 400, 'invalid_action', 'Unsupported bulk action.');
  });

  return router;
}
