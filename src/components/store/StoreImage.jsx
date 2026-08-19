import { useEffect, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';

/**
 * Storefront image with a fixed aspect ratio box, lazy loading and a graceful
 * fallback. Never stretches: images are contained inside the ratio box.
 */
export function StoreImage({ src, alt = '', eager = false, className = '' }) {
  const [status, setStatus] = useState(src ? 'loading' : 'missing');

  useEffect(() => {
    setStatus(src ? 'loading' : 'missing');
  }, [src]);

  const failed = status === 'missing' || status === 'error';

  return (
    <span className={`store-image store-image-${status} ${className}`.trim()}>
      {!failed && (
        <img
          src={src}
          alt={alt || ''}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
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
