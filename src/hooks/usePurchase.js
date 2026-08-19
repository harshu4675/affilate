import { useCallback, useState } from 'react';
import { fetchPurchaseLink } from '../services/catalogApi.js';

/**
 * Resolves the affiliate/store URL for a product and drives the redirect
 * overlay. The URL itself is resolved server-side so the storefront never
 * navigates to an unvalidated link.
 */
export function usePurchase() {
  const [state, setState] = useState(null);

  const buy = useCallback(async (product) => {
    if (!product || !product.id) return;
    const storeLabel = product.store && product.store.label ? product.store.label : '';
    setState({ status: 'loading', storeLabel, productId: product.id });
    try {
      const data = await fetchPurchaseLink(product.id, { timeoutMs: 10000 });
      if (!data || !data.url) {
        setState({ status: 'error', message: 'This product does not have a store link yet.' });
        return;
      }
      setState({ status: 'ready', url: data.url, storeLabel: data.store || storeLabel });
    } catch (error) {
      const message =
        error && error.code === 'no_link'
          ? 'This product does not have a store link yet. Please try another product.'
          : error && error.code === 'not_found'
            ? 'This product is no longer available.'
            : 'We could not open the store link. Please check your connection and try again.';
      setState({ status: 'error', message });
    }
  }, []);

  const reset = useCallback(() => setState(null), []);

  return { purchaseState: state, buy, reset };
}
