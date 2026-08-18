import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.AFFILATE_DATA_DIR
  ? path.resolve(process.env.AFFILATE_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'catalog.json');
const VERSION = 1;

const empty = () => ({ version: VERSION, updatedAt: null, products: [], removedIds: [] });

let cache = null;
let writable = true;

function normalizeRecord(value) {
  if (!value || typeof value !== 'object' || !value.id) return null;
  return {
    ...value,
    id: String(value.id),
    visible: value.visible !== false,
    images: Array.isArray(value.images) ? value.images : [],
    tags: Array.isArray(value.tags) ? value.tags : [],
    features: Array.isArray(value.features) ? value.features : [],
    specifications: Array.isArray(value.specifications) ? value.specifications : [],
    adminEditedFields: Array.isArray(value.adminEditedFields) ? value.adminEditedFields : []
  };
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    version: VERSION,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
    products: Array.isArray(source.products) ? source.products.map(normalizeRecord).filter(Boolean) : [],
    removedIds: Array.isArray(source.removedIds) ? source.removedIds.map(String) : []
  };
}

function read() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    cache = normalizeState(JSON.parse(raw));
  } catch {
    cache = empty();
  }
  return cache;
}

function write(state) {
  const next = normalizeState({ ...state, updatedAt: new Date().toISOString() });
  cache = next;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
    writable = true;
    return { ok: true };
  } catch (error) {
    writable = false;
    return { ok: false, code: 'storage_unavailable', message: 'The catalog file could not be written.', detail: error.message };
  }
}

export function catalogInfo() {
  const state = read();
  return { file: DATA_FILE, writable, updatedAt: state.updatedAt, count: state.products.length };
}

export function listProducts() {
  return read().products;
}

export function getProduct(id) {
  return read().products.find((item) => item.id === String(id)) || null;
}

export function saveProducts(products, removedIds) {
  const state = read();
  return write({
    ...state,
    products,
    removedIds: removedIds || state.removedIds
  });
}

export function upsertProduct(record) {
  const state = read();
  const products = [...state.products];
  const index = products.findIndex((item) => item.id === record.id);
  if (index === -1) products.unshift(record);
  else products[index] = record;
  const result = write({ ...state, products, removedIds: state.removedIds.filter((id) => id !== record.id) });
  return result.ok ? { ok: true, product: record } : result;
}

export function removeProducts(ids) {
  const state = read();
  const idSet = new Set(ids.map(String));
  const products = state.products.filter((item) => !idSet.has(item.id));
  const removedIds = [...new Set([...state.removedIds, ...idSet])].slice(-2000);
  const result = write({ ...state, products, removedIds });
  return result.ok ? { ok: true, removed: state.products.length - products.length } : result;
}

export function isRemoved(id) {
  return read().removedIds.includes(String(id));
}

export function clearRemoved(ids) {
  const state = read();
  const idSet = new Set((ids || []).map(String));
  const removedIds = ids ? state.removedIds.filter((id) => !idSet.has(id)) : [];
  return write({ ...state, removedIds });
}
