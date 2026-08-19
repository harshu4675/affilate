import { useEffect, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';

export function SafeImage({ src, alt = '', className = '', imageClassName = '', loading = 'lazy', onLoad, onError, ...rest }) {
  const [status, setStatus] = useState(src ? 'loading' : 'missing');

  useEffect(() => {
    setStatus(src ? 'loading' : 'missing');
  }, [src]);

  return (
    <span className={`safe-image safe-image-${status} ${className}`}>
      {src && status !== 'error' ? (
        <img
          {...rest}
          className={imageClassName}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={(event) => {
            setStatus('ready');
            if (onLoad) onLoad(event);
          }}
          onError={(event) => {
            setStatus('error');
            if (onError) onError(event);
          }}
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
