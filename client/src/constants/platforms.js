export const PLATFORMS = [
  {
    id: 'amazon',
    label: 'Amazon',
    domains: [
      'amazon.com',
      'amazon.ca',
      'amazon.co.uk',
      'amazon.de',
      'amazon.fr',
      'amazon.it',
      'amazon.es',
      'amazon.nl',
      'amazon.in',
      'amazon.com.au',
      'amazon.com.br',
      'amazon.com.mx',
      'amazon.ae',
      'amazon.sg',
      'amazon.co.jp',
      'amazon.pl',
      'amazon.se',
      'amazon.com.tr',
      'amazon.eg',
      'amazon.sa',
      'amzn.in',
      'amzn.to',
      'a.co'
    ],
    color: '#f59e0b'
  },
  {
    id: 'ebay',
    label: 'eBay',
    domains: ['ebay.com', 'ebay.co.uk', 'ebay.de', 'ebay.fr', 'ebay.it', 'ebay.es', 'ebay.ca', 'ebay.com.au', 'ebay.in'],
    color: '#2563eb'
  },
  {
    id: 'walmart',
    label: 'Walmart',
    domains: ['walmart.com'],
    color: '#0071dc'
  },
  {
    id: 'etsy',
    label: 'Etsy',
    domains: ['etsy.com'],
    color: '#ea580c'
  },
  {
    id: 'aliexpress',
    label: 'AliExpress',
    domains: ['aliexpress.com', 'aliexpress.us'],
    color: '#dc2626'
  },
  {
    id: 'shopify',
    label: 'Shopify store',
    domains: [],
    color: '#4d7c0f'
  },
  {
    id: 'generic',
    label: 'Generic store',
    domains: [],
    color: '#667085'
  }
];

export function getPlatform(id) {
  return PLATFORMS.find((platform) => platform.id === id) || PLATFORMS[PLATFORMS.length - 1];
}
