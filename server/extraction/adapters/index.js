import { amazonAdapter } from './amazon.js';
import { ebayAdapter } from './ebay.js';
import { walmartAdapter } from './walmart.js';
import { etsyAdapter } from './etsy.js';
import { aliexpressAdapter } from './aliexpress.js';
import { shopifyAdapter } from './shopify.js';
import { genericAdapter } from './generic.js';

export const ADAPTERS = [amazonAdapter, ebayAdapter, walmartAdapter, etsyAdapter, aliexpressAdapter, shopifyAdapter, genericAdapter];

export function getAdapter(id) {
  return ADAPTERS.find((adapter) => adapter.id === id) || genericAdapter;
}
