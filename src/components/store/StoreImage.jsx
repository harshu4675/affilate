import { useEffect, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';
import { amazonRetryUrl } from '../../services/imageService.js';

/**
 * Storefront image with a fixed aspect ratio box, lazy loading and a graceful
 * fallback. Never stretches: images are contained inside the ratio box.
 * If a stored size-variant URL is dead, it transparently retries the original.
 */
export function StoreImage({ src, alt = '', eager = false, className = '' }) {
  const [status, setStatus] = useState(src ? 'loading' : 'missing');
  const [effectiveSrc, setEffectiveSrc] = useState(src);

  useEffect(() => {
    setEffectiveSrc(src);
    setStatus(src ? 'loading' : 'missing');
  }, [src]);

  const failed = status === 'missing' || status === 'error';

  const handleError = () => {
    const retry = amazonRetryUrl(effectiveSrc);
    if (retry && retry !== effectiveSrc) {
      setEffectiveSrc(retry);
      setStatus('loading');
      return;
    }
    setStatus('error');
  };

  return (
    <span className={`store-image store-image-${status} ${className}`.trim()}>
      {!failed && (
        <img
          src={effectiveSrc}
          alt={alt || ''}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('ready')}
          onError={handleError}
        />
      )}
      {failed && (
        <span className="store-image-fallback" role="img" aria-label={alt || 'Image unavailable'}>
          <Icon name="image" size={20} />
        </span>
      )}
    </span>
  );
}
