// Seeds the local storefront catalog with clearly-marked demo products so
// the live preview can show: 10-image gallery, PDP related products, and the
// admin panel. Images are real, sharp photos from picsum.photos (1600px).
// Demo products are deletable from the admin panel; this only touches
// server/data/catalog.json (gitignored local runtime data).
const API = 'http://127.0.0.1:8787';

const img = (seed, w = 1600, h = 1200) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const base = (id, title, price, originalPrice, category, subcategory, imageSeeds, currency = 'USD', extra = {}) => ({
  id,
  title,
  shortDescription: extra.short || '',
  description: extra.desc || '',
  brand: extra.brand || '',
  category,
  subcategory,
  sku: extra.sku || '',
  productId: extra.sku || '',
  currency,
  price,
  originalPrice,
  discountPercent: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null,
  availability: extra.availability || 'In Stock',
  condition: extra.condition || 'New',
  seller: extra.seller || '',
  images: imageSeeds.map((seed, index) => ({
    id: `img_${id}_${index}`,
    url: img(seed),
    alt: `${title} - image ${index + 1}`,
    position: index,
    isPrimary: index === 0,
    source: 'extracted'
  })),
  removedImages: [],
  variants: extra.variants || [],
  specifications: extra.specs || [],
  features: extra.features || [],
  tags: extra.tags || [],
  affiliateUrl: extra.affiliateUrl || '',
  source: {
    url: extra.sourceUrl || '',
    originalUrl: extra.affiliateUrl || extra.sourceUrl || '',
    finalUrl: extra.sourceUrl || '',
    platform: extra.platform || 'generic',
    platformLabel: extra.platformLabel || 'Store',
    domain: extra.domain || '',
    extractedAt: new Date().toISOString(),
    lastRefreshedAt: new Date().toISOString(),
    partial: false,
    missingFields: []
  },
  status: 'published',
  editedFields: [],
  createdAt: extra.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const products = [
  base(
    'prod_demo_cargo_pants',
    '[Demo] UrbanTrek Men\u2019s Cargo Pants \u2013 6 Pocket, Lightweight',
    24.99,
    39.99,
    'Clothing',
    'Mens Pants',
    ['cargo-1', 'cargo-2', 'cargo-3', 'cargo-4', 'cargo-5', 'cargo-6', 'cargo-7', 'cargo-8', 'cargo-9', 'cargo-10'],
    'USD',
    {
      brand: 'UrbanTrek',
      sku: 'UT-CARGO-100',
      desc: 'Lightweight cargo pants with six pockets, stretch fabric and a relaxed fit. Great for travel and everyday wear. This demo product has all 10 images from the import.',
      short: 'Six-pocket cargo pants in a lightweight stretch fabric.',
      features: ['SIX POCKETS: Roomy cargo pockets with flap closure', 'BREATHABLE: Lightweight quick-dry fabric', 'STRETCH FIT: Four-way stretch for all-day comfort'],
      tags: ['cargo', 'pants', 'men', 'outdoor', 'travel'],
      specs: [
        { label: 'Material', value: '98% Cotton, 2% Elastane' },
        { label: 'Care', value: 'Machine wash cold' },
        { label: 'Fit', value: 'Relaxed' }
      ],
      platform: 'amazon',
      platformLabel: 'Amazon',
      domain: 'www.amazon.com',
      sourceUrl: 'https://www.amazon.com/dp/B0CARGO123',
      affiliateUrl: 'https://www.amazon.com/dp/B0CARGO123?tag=demo-aff-20'
    }
  ),
  base(
    'prod_demo_cargo_shorts',
    '[Demo] UrbanTrek Men\u2019s Cargo Shorts \u2013 Quick Dry',
    18.5,
    29.99,
    'Clothing',
    'Mens Shorts',
    ['shorts-1', 'shorts-2', 'shorts-3', 'shorts-4'],
    'USD',
    {
      brand: 'UrbanTrek',
      sku: 'UT-CARGO-110',
      desc: 'Quick-dry cargo shorts with four pockets. Pairs with the demo cargo pants.',
      features: ['QUICK DRY: Dries in under an hour', 'FOUR POCKETS: Secure storage on the move'],
      tags: ['cargo', 'shorts', 'men', 'outdoor'],
      platform: 'amazon',
      platformLabel: 'Amazon',
      domain: 'www.amazon.com',
      sourceUrl: 'https://www.amazon.com/dp/B0CARGO110',
      affiliateUrl: 'https://www.amazon.com/dp/B0CARGO110?tag=demo-aff-20'
    }
  ),
  base(
    'prod_demo_hiking_jacket',
    '[Demo] Alpine Trek Packable Hiking Jacket',
    45,
    69.99,
    'Clothing',
    'Mens Jackets',
    ['jacket-1', 'jacket-2', 'jacket-3', 'jacket-4'],
    'USD',
    {
      brand: 'Alpine Trek',
      sku: 'AT-JKT-200',
      desc: 'Packable, water-resistant hiking jacket that folds into its own pocket.',
      features: ['WATER RESISTANT: 10K DWR shell', 'PACKABLE: Stows in its own pocket'],
      tags: ['jacket', 'hiking', 'men', 'outdoor'],
      platform: 'ebay',
      platformLabel: 'eBay',
      domain: 'www.ebay.com',
      sourceUrl: 'https://www.ebay.com/itm/200200200200',
      affiliateUrl: 'https://www.ebay.com/itm/200200200200?campid=demo'
    }
  )
];

const login = await fetch(`${API}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'talishh-admin' })
});
if (!login.ok) {
  console.log('LOGIN FAILED', await login.text());
  process.exit(1);
}
const cookie = (login.headers.getSetCookie() || []).map((c) => c.split(';')[0]).join('; ');
const publish = await fetch(`${API}/api/admin/publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ products, mode: 'replace' })
});
const body = await publish.json();
console.log(publish.ok ? `SEEDED: ${body.data.published} products (total ${body.data.total})` : `SEED FAILED: ${JSON.stringify(body)}`);
process.exit(publish.ok ? 0 : 1);
