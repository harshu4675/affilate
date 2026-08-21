/**
 * "Pick Best Products" scoring.
 *
 * Ranks library products for promotion using ONLY data that actually exists
 * on the product record (price, discount, availability, images, links,
 * metadata completeness). Nothing is invented: a missing signal simply earns
 * zero points and is reported as such.
 */

const IN_STOCK_RE = /\bin\s+stock\b|\bavailable\b/i;
const OUT_OF_STOCK_RE = /\bout of stock\b|\bunavailable\b|\bsold out\b/i;

export function scoreProduct(product) {
  const reasons = [];
  const add = (label, points, detail = '') => reasons.push({ label, points, detail });

  let total = 0;
  const award = (points) => {
    total += points;
    return points;
  };

  if (!product || typeof product !== 'object') {
    return { total: 0, reasons, availability: 'unknown' };
  }

  // Price (15) — a product needs a real price to be promoted.
  if (product.price != null && product.price > 0) {
    add('Has price', award(15));
  } else {
    add('No price', 0);
  }

  // Discount (15) — only the real, derived discount.
  const discount = product.discountPercent != null ? Math.round(product.discountPercent) : null;
  if (discount != null && discount >= 20) {
    add(`Deep discount (${discount}%)`, award(15));
  } else if (discount != null && discount > 0) {
    add(`Discount (${discount}%)`, award(10));
  } else {
    add('No discount', 0);
  }

  // Availability (10) — real availability text from the source.
  const availabilityText = String(product.availability || '');
  let availability = 'unknown';
  if (IN_STOCK_RE.test(availabilityText) && !OUT_OF_STOCK_RE.test(availabilityText)) {
    availability = 'in_stock';
    add('In stock', award(10));
  } else if (OUT_OF_STOCK_RE.test(availabilityText)) {
    availability = 'out_of_stock';
    add('Out of stock', 0);
  } else if (availabilityText) {
    add('Availability listed', award(5));
  } else {
    add('No availability info', 0);
  }

  // Images (15) — count of valid image entries.
  const imageCount = Array.isArray(product.images) ? product.images.filter((image) => image && image.url).length : 0;
  if (imageCount >= 5) add(`${imageCount} images`, award(15));
  else if (imageCount >= 3) add(`${imageCount} images`, award(12));
  else if (imageCount >= 1) add(`1 image`, award(8));
  else add('No images', 0);

  // Affiliate / store link (15) — required to run ads or affiliate traffic.
  const source = product.source || {};
  const hasLink = Boolean(product.affiliateUrl || source.url || source.originalUrl || source.finalUrl);
  if (product.affiliateUrl) add('Affiliate link ready', award(15));
  else if (hasLink) add('Store link ready', award(15));
  else add('No store link', 0);

  // Completeness (20) — metadata that helps a promotional listing.
  if (product.category) add('Categorized', award(5));
  else add('No category', 0);
  if (product.description && product.description.length >= 40) add('Full description', award(10));
  else if (product.description) add('Short description', award(5));
  else add('No description', 0);
  if (product.brand) add('Has brand', award(5));
  else add('No brand', 0);

  return { total, reasons, availability, imageCount, discount };
}

/**
 * Rank products best-first. Returns [{ product, score, reasons, ... }].
 */
export function rankProducts(products) {
  return (products || [])
    .map((product) => {
      const result = scoreProduct(product);
      return { product, ...result };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      // Tiebreak: more images, then higher discount, then newer.
      const images = (b.imageCount || 0) - (a.imageCount || 0);
      if (images !== 0) return images;
      const discount = (b.discount || 0) - (a.discount || 0);
      if (discount !== 0) return discount;
      return new Date(b.product.updatedAt || 0) - new Date(a.product.updatedAt || 0);
    });
}
