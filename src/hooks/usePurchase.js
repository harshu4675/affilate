import { useCallback, useState } from 'react';
import { fetchPurchaseLink } from '../services/catalogApi.js';

/**
 * Opens a blank tab synchronously, inside the user gesture, so the store link
 * can be sent there once the affiliate URL has been resolved. Doing it later
 * (after the await) is what browsers block as a popup.
 */
function openPendingTab() {
  try {
    const tab = window.open('', '_blank');
    if (tab) {
      // Sever the opener link while the tab is still same-origin (about:blank)
      // so the store page can never touch this window (reverse tabnabbing).
      try {
        tab.opener = null;
      } catch {
        /* ignore: some browsers make opener read-only */
      }
    }
    return tab || null;
  } catch {
    return null;
  }
}

function sendTabTo(tab, url) {
  if (tab) {
    try {
      if (tab.location && typeof tab.location.replace === 'function') tab.location.replace(url);
      else tab.location = url;
      return true;
    } catch {
      /* fall through to a fresh window.open */
    }
  }
  try {
    const opened = window.open(url, '_blank', 'noopener');
    return Boolean(opened);
  } catch {
    return false;
  }
}

function closeTab(tab) {
  if (!tab) return;
  try {
    tab.close();
  } catch {
    /* ignore */
  }
}

/**
 * Resolves the affiliate/store URL for a product and hands it to a new browser
 * tab. The URL itself is resolved server-side so the storefront never opens an
 * unvalidated link, and Talishh always stays open in the original tab.
 */
export function usePurchase() {
  const [state, setState] = useState(null);

  const buy = useCallback(async (product) => {
    if (!product || !product.id) return;
    const storeLabel = product.store && product.store.label ? product.store.label : '';
    const tab = openPendingTab();
    setState({ status: 'loading', storeLabel, productId: product.id });
    try {
      const data = await fetchPurchaseLink(product.id, { timeoutMs: 10000 });
      if (!data || !data.url) {
        closeTab(tab);
        setState({ status: 'error', message: 'This product does not have a store link yet.' });
        return;
      }
      const opened = sendTabTo(tab, data.url);
      setState({
        status: 'ready',
        url: data.url,
        opened,
        storeLabel: data.store || storeLabel
      });
    } catch (error) {
      closeTab(tab);
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
