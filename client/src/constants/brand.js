export const BRAND = {
  name: 'Talishh',
  tagline: 'Handpicked deals from the stores you already love',
  thanksMessage: 'Thanks for shopping with Talishh',
  supportNote: 'Talishh links you to the store. Purchases are completed on the store website.'
};

export const STORE_SORT_OPTIONS = [
  { id: 'newest', label: 'Latest' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'alpha', label: 'Name: A to Z' }
];

export const STORE_PRICE_RANGES = [
  { id: 'any', label: 'Any price', min: '', max: '' },
  { id: '0-500', label: 'Under 500', min: '', max: 500 },
  { id: '500-1000', label: '500 - 1,000', min: 500, max: 1000 },
  { id: '1000-5000', label: '1,000 - 5,000', min: 1000, max: 5000 },
  { id: '5000-20000', label: '5,000 - 20,000', min: 5000, max: 20000 },
  { id: '20000', label: 'Over 20,000', min: 20000, max: '' }
];
