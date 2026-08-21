import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';
import { amazonRetryUrl } from '../../services/imageService.js';

/**
 * Storefront image with a fixed aspect-ratio box, graceful fallback and a
 * transparent retry for dead Amazon size-variant URLs.
 *
 * Rendering rules that matter (these were the source of the "blank thumbnail
 * in the listing" bug):
 *
 *  1. The <img> is ALWAYS mounted while we have a source. The loading
 *     placeholder is painted *behind* it (see .store-image::before), never on
 *     top of it, so a stale "loading" state can never hide a decoded image.
 *  2. A cached image very often finishes loading before React attaches the
 *     onLoad handler (grid cards mount after the browser already has the file,
 *     e.g. coming back from the product page or re-rendering the grid). The
 *     load event is then never delivered and the component would stay in the
 *     "loading" state forever. We therefore reconcile with the real DOM node
 *     (`img.complete` / `img.naturalWidth`) on mount and whenever the source
 *     changes, instead of trusting the event alone.
 */
export function StoreImage({ src, alt = '', eager = false, className = '', sizes }) {
  const [status, setStatus] = useState(src ? 'loading' : 'missing');
  const [effectiveSrc, setEffectiveSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    setEffectiveSrc(src);
    setStatus(src ? 'loading' : 'missing');
  }, [src]);

  const fail = useCallback(() => {
    const current = imgRef.current;
    const url = (current && current.getAttribute('src')) || effectiveSrc;
    const retry = amazonRetryUrl(url);
    if (retry && retry !== url) {
      setEffectiveSrc(retry);
      setStatus('loading');
      return;
    }
    setStatus('error');
  }, [effectiveSrc]);

  // Reconcile React state with what the browser actually did with the <img>.
  const sync = useCallback(() => {
    const node = imgRef.current;
    if (!node || !node.getAttribute('src')) return;
    if (!node.complete) return;
    if (node.naturalWidth > 0) setStatus('ready');
    else fail();
  }, [fail]);

  useEffect(() => {
    sync();
  }, [sync, effectiveSrc]);

  const attachRef = useCallback(
    (node) => {
      imgRef.current = node;
      if (node) sync();
    },
    [sync]
  );

  const missing = !effectiveSrc || status === 'missing';
  const errored = status === 'error';

  return (
    <span className={`store-image store-image-${status} ${className}`.trim()}>
      {!missing && !errored && (
        <img
          ref={attachRef}
          src={effectiveSrc}
          alt={alt || ''}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('ready')}
          onError={fail}
        />
      )}
      {(missing || errored) && (
        <span className="store-image-fallback" role="img" aria-label={alt || 'Image unavailable'}>
          <Icon name="image" size={20} />
        </span>
      )}
    </span>
  );
}
