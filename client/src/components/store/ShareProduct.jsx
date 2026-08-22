import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';

function copyToClipboard(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(url);
  }
  return new Promise((resolve, reject) => {
    try {
      const field = document.createElement('textarea');
      field.value = url;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(field);
      if (ok) resolve();
      else reject(new Error('copy_failed'));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Share the current product: native share sheet where the browser supports it,
 * clipboard copy (with a small inline confirmation) everywhere else.
 * The shared link is always the product page URL the visitor is on.
 */
export function ShareProduct({ title, className = '' }) {
  const [feedback, setFeedback] = useState('');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = useCallback((message) => {
    setFeedback(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFeedback(''), 2600);
  }, []);

  const onShare = useCallback(async () => {
    const url = window.location.href;
    const payload = { title: title || 'Product', text: title || '', url };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      } catch (error) {
        // The visitor closing the native sheet is not an error worth reporting.
        if (error && error.name === 'AbortError') return;
      }
    }

    try {
      await copyToClipboard(url);
      flash('Link copied');
    } catch {
      flash('Copy failed');
    }
  }, [flash, title]);

  return (
    <div className={`share-product ${className}`.trim()}>
      <button type="button" className="share-product-btn" onClick={onShare}>
        <Icon name="link" size={15} />
        <span>Share product</span>
      </button>
      <span className="share-product-feedback" role="status" aria-live="polite">
        {feedback}
      </span>
    </div>
  );
}
