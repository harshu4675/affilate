import * as cheerio from 'cheerio';

export function loadHtml(html) {
  return cheerio.load(html);
}

export function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function textOf($, selector) {
  const el = $(selector).first();
  return el.length ? clean(el.text()) : '';
}

export function attrOf($, selector, attr) {
  const el = $(selector).first();
  return el.length ? clean(el.attr(attr)) : '';
}

export function contentOf($, selector) {
  const el = $(selector).first();
  return el.length ? clean(el.attr('content')) : '';
}

export function metaMap($) {
  const map = {};
  $('meta').each((index, el) => {
    const $el = $(el);
    const key = $el.attr('property') || $el.attr('name') || $el.attr('itemprop');
    const content = $el.attr('content');
    if (key && content) {
      const normalized = String(key).toLowerCase();
      if (!(normalized in map)) map[normalized] = String(content).trim();
    }
  });
  return map;
}

export function ogImageList($, meta = metaMap($)) {
  const list = [];
  const push = (value) => {
    if (value && /^https?:\/\//i.test(value) && !list.includes(value)) list.push(value);
  };
  push(meta['og:image']);
  push(meta['og:image:secure_url']);
  push(meta['og:image:url']);
  $('link[rel="image_src"]').each((index, el) => push(clean($(el).attr('href'))));
  return list;
}

export function jsonLdProducts($) {
  const results = [];
  const seen = new Set();
  $('script[type="application/ld+json" i]').each((index, el) => {
    const raw = ($(el).html() || '').trim();
    if (!raw) return;
    const data = parseJsonLd(raw);
    if (!data) return;
    collectProducts(data, results, seen, 0);
  });
  return results;
}

function parseJsonLd(raw) {
  const sanitized = raw
    .replace(/^\s*<!--|-->\s*$/g, '')
    .replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '')
    .replace(/;\s*$/, '');
  const attempts = [raw, sanitized];
  for (const value of attempts) {
    try {
      return JSON.parse(value);
    } catch {
      continue;
    }
  }
  return null;
}

function collectProducts(node, out, seen, depth) {
  if (!node || typeof node !== 'object' || depth > 12 || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) collectProducts(item, out, seen, depth + 1);
    return;
  }
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  const isProduct = types.some((entry) => {
    if (typeof entry !== 'string') return false;
    const normalized = entry.split(':').pop().toLowerCase();
    return normalized === 'product' || normalized === 'individualproduct' || normalized === 'productgroup';
  });
  if (isProduct) out.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === '@context' || key === '@type' || key === '@id') continue;
    if (value && typeof value === 'object') collectProducts(value, out, seen, depth + 1);
  }
}

export function jsonLdImages(node) {
  const images = [];
  const walk = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) images.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object') {
      if (value.url) walk(value.url);
    }
  };
  walk(node && node.image);
  return images;
}

export function parsePrice(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,\-]/g, '');
  if (!cleaned) return null;
  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '');
  if (!digits) return null;
  const hasComma = digits.includes(',');
  const hasDot = digits.includes('.');
  let normalized;
  if (hasComma && hasDot) {
    normalized = digits.lastIndexOf(',') > digits.lastIndexOf('.') ? digits.replace(/\./g, '').replace(',', '.') : digits.replace(/,/g, '');
  } else if (hasComma) {
    const parts = digits.split(',');
    normalized = parts.length === 2 && parts[1].length <= 2 ? digits.replace(',', '.') : digits.replace(/,/g, '');
  } else {
    normalized = digits;
  }
  const value = parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}

export function firstText(selectors, $) {
  for (const selector of selectors) {
    const value = textOf($, selector);
    if (value) return value;
  }
  return '';
}

export function firstPrice(selectors, $) {
  for (const selector of selectors) {
    const raw = textOf($, selector) || contentOf($, selector);
    const value = parsePrice(raw);
    if (value != null) return value;
  }
  return null;
}

export function specificValues($, tableSelector) {
  const specs = [];
  $(tableSelector).each((index, table) => {
    $(table)
      .find('tr')
      .each((i, row) => {
        const $row = $(row);
        const label = clean($row.find('th').text() || $row.find('.attrLabels').text());
        const value = clean($row.find('td').last().text());
        if (label && value && label.toLowerCase() !== value.toLowerCase()) specs.push({ label, value });
      });
  });
  return specs;
}
