import { formatDate } from '../utils/format.js';

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportProductsCsv(products) {
  const header = [
    'id',
    'title',
    'brand',
    'category',
    'subcategory',
    'price',
    'original_price',
    'currency',
    'discount_percent',
    'status',
    'platform',
    'source_url',
    'sku',
    'product_id',
    'seller',
    'availability',
    'condition',
    'extracted_at',
    'updated_at',
    'image_count'
  ];
  const rows = products.map((product) => [
    product.id,
    product.title,
    product.brand,
    product.category,
    product.subcategory,
    product.price,
    product.originalPrice,
    product.currency,
    product.discountPercent,
    product.status,
    product.source && product.source.platformLabel,
    product.source && product.source.url,
    product.sku,
    product.productId,
    product.seller,
    product.availability,
    product.condition,
    product.source && formatDate(product.source.extractedAt),
    formatDate(product.updatedAt),
    (product.images || []).length
  ]);
  const content = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  download(`affilate-products-${dateStamp()}.csv`, content, 'text/csv;charset=utf-8');
}

export function exportProductsJson(products) {
  const content = JSON.stringify(products, null, 2);
  download(`affilate-products-${dateStamp()}.json`, content, 'application/json');
}

function dateStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}
