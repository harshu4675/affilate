import { useEffect, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';
import { amazonRetryUrl } from '../../services/imageService.js';

export function SafeImage({ src, alt = '', className = '', imageClassName = '', loading = 'lazy', onLoad, onError, ...rest }) {
  const [status, setStatus] = useState(src ? 'loading' : 'missing');
  // Normally identical to `src`. If the URL 404s and a safer original exists
  // (e.g. an Amazon size-variant URL), we retry once with that URL.
  const [effectiveSrc, setEffectiveSrc] = useState(src);

  useEffect(() => {
    setEffectiveSrc(src);
    setStatus(src ? 'loading' : 'missing');
  }, [src]);

  const handleLoad = (event) => {
    setStatus('ready');
    if (onLoad) onLoad(event);
  };

  const handleError = (event) => {
    const retry = amazonRetryUrl(effectiveSrc);
    if (retry && retry !== effectiveSrc) {
      setEffectiveSrc(retry);
      setStatus('loading');
      return;
    }
    setStatus('error');
    if (onError) onError(event);
  };

  return (
    <span className={`safe-image safe-image-${status} ${className}`.trim()}>
      {effectiveSrc && status !== 'error' ? (
        <img
          {...rest}
          className={imageClassName}
          src={effectiveSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <span className="safe-image-fallback" role="img" aria-label={alt || 'Image unavailable'}>
          <Icon name="image" size={18} />
          <span>Image unavailable</span>
        </span>
      )}
      {status === 'loading' && <span className="safe-image-loading" aria-hidden="true" />}
    </span>
  );
}
