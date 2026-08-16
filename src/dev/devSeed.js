import { createId } from '../utils/id.js';

const sampleProducts = [
  {
    title: 'Wireless Noise Cancelling Headphones',
    brand: 'SoundPeak',
    category: 'Electronics',
    subcategory: 'Headphones',
    price: 129.99,
    originalPrice: 199.99,
    currency: 'USD',
    description: 'Over-ear wireless headphones with active noise cancellation, 30-hour battery life and comfortable memory foam ear cushions.',
    availability: 'In stock',
    seller: 'SoundPeak Official Store',
    platform: 'amazon',
    platformLabel: 'Amazon'
  },
  {
    title: 'Stainless Steel Water Bottle 750ml',
    brand: 'HydraMax',
    category: 'Kitchen',
    subcategory: 'Drinkware',
    price: 24.95,
    originalPrice: null,
    currency: 'USD',
    description: 'Double-wall vacuum insulated bottle keeps drinks cold for 24 hours or hot for 12 hours. Leak-proof lid, BPA free.',
    availability: 'In stock',
    seller: 'HydraMax',
    platform: 'ebay',
    platformLabel: 'eBay'
  },
  {
    title: 'Minimalist Leather Crossbody Bag',
    brand: 'Aurelia',
    category: 'Fashion',
    subcategory: 'Bags',
    price: 58,
    originalPrice: 78,
    currency: 'USD',
    description: 'Handcrafted genuine leather crossbody bag with adjustable strap and magnetic closure.',
    availability: 'In stock',
    seller: 'AureliaStudio',
    platform: 'etsy',
    platformLabel: 'Etsy'
  }
];

export function installDevSeed(products, upsertProduct) {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return;
  window.__seedDemoProducts = () => {
    const now = new Date().toISOString();
    const existingTitles = new Set(products.map((item) => item.title));
    let added = 0;
    for (const sample of sampleProducts) {
      if (existingTitles.has(sample.title)) continue;
      upsertProduct({
        id: createId('prod'),
        title: sample.title,
        brand: sample.brand,
        category: sample.category,
        subcategory: sample.subcategory,
        price: sample.price,
        originalPrice: sample.originalPrice,
        discountPercent:
          sample.originalPrice != null
            ? Math.round(((sample.originalPrice - sample.price) / sample.originalPrice) * 100)
            : null,
        currency: sample.currency,
        description: sample.description,
        shortDescription: '',
        availability: sample.availability,
        condition: '',
        seller: sample.seller,
        sku: '',
        productId: '',
        images: [],
        removedImages: [],
        variants: [],
        specifications: [],
        features: [],
        tags: [],
        source: {
          url: '',
          finalUrl: '',
          platform: sample.platform,
          platformLabel: sample.platformLabel,
          domain: `${sample.platform}.com`,
          extractedAt: now,
          lastRefreshedAt: now
        },
        status: 'ready',
        editedFields: [],
        createdAt: now,
        updatedAt: now
      });
      added += 1;
    }
    return added;
  };
}
