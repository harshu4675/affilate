import { useMemo, useRef, useState } from 'react';
import { Icon } from '../icons/Icons.jsx';
import { Button } from '../ui/Button.jsx';
import { ExtractionOverlay } from './ExtractionOverlay.jsx';
import { useExtraction } from '../../hooks/useExtraction.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { validateUrlInput, URL_VALIDATION_MESSAGES } from '../../extraction/urlValidation.js';
import { detectPlatformFromUrl } from '../../extraction/platformDetection.js';
import { getPlatform } from '../../constants/platforms.js';
import { safeExternalHref } from '../../utils/url.js';

export function UrlExtractor({ onResult, onError, onManual, autoFocus = false }) {
  const { phase, error, platform, run } = useExtraction();
  const [url, setUrl] = useState('');
  const debouncedUrl = useDebounce(url, 250);
  const [showError, setShowError] = useState(false);
  const inputRef = useRef(null);

  const hint = useMemo(() => {
    const value = debouncedUrl.trim();
    if (!value) return null;
    const validation = validateUrlInput(value);
    if (!validation.valid) {
      return { kind: 'invalid', message: URL_VALIDATION_MESSAGES[validation.reason] };
    }
    const detected = detectPlatformFromUrl(value);
    return { kind: 'valid', platform: detected };
  }, [debouncedUrl]);

  const extracting = phase === 'validating' || phase === 'detecting' || phase === 'extracting' || phase === 'processing';

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    if (extracting) return;
    if (!url.trim()) {
      setShowError(true);
      inputRef.current && inputRef.current.focus();
      return;
    }
    setShowError(false);
    const data = await run(url);
    if (data && onResult) {
      onResult(data);
    } else if (!data && onError) {
      onError(url);
    }
  };

  return (
    <div className="extractor">
      <form className="extractor-form" onSubmit={handleSubmit} noValidate>
        <div className={`extractor-input-wrap${showError ? ' has-error' : ''}`}>
          <span className="extractor-input-icon">
            <Icon name="link" size={17} />
          </span>
          <input
            ref={inputRef}
            className="input extractor-input"
            type="url"
            inputMode="url"
            placeholder="Paste a product link, e.g. https://www.amazon.com/dp/B0..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setShowError(false);
            }}
            autoFocus={autoFocus}
            aria-label="Product URL"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {url && (
            <button type="button" className="extractor-clear" aria-label="Clear link" onClick={() => setUrl('')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <Button type="submit" size="lg" icon="zap" loading={extracting} className="extractor-submit">
          {extracting ? 'Extracting' : 'Extract product'}
        </Button>
      </form>

      {hint && (
        <div className={`extractor-hint extractor-hint-${hint.kind}`}>
          {hint.kind === 'valid' ? (
            <>
              <span className="hint-status-icon hint-ok">
                <Icon name="check" size={13} />
              </span>
              <span className="hint-platform">
                <span
                  className="platform-dot"
                  style={{ backgroundColor: getPlatform(hint.platform.id).color }}
                />
                {hint.platform.matched ? hint.platform.label : 'Generic store'}
              </span>
              <span className="hint-domain">{hint.platform.domain}</span>
              <span className="hint-valid-text">Valid link</span>
            </>
          ) : (
            <>
              <span className="hint-status-icon hint-warn">
                <Icon name="alertCircle" size={13} />
              </span>
              <span className="hint-message">{hint.message}</span>
            </>
          )}
        </div>
      )}

      {phase === 'error' && error && (
        <div className="extraction-error">
          <div className="extraction-error-icon">
            <Icon name="alertTriangle" size={20} />
          </div>
          <div className="extraction-error-content">
            <h4 className="extraction-error-title">{error.title}</h4>
            <p className="extraction-error-hint">{error.hint}</p>
          </div>
          <div className="extraction-error-actions">
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => handleSubmit()}>
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowError(true);
                inputRef.current && inputRef.current.focus();
              }}
            >
              Edit link
            </Button>
            {(error.code === 'blocked' || error.code === 'no_product' || error.code === 'not_found' || error.code === 'http_error') &&
              url &&
              safeExternalHref(url) && (
                <a className="btn btn-ghost btn-sm" href={safeExternalHref(url)} target="_blank" rel="noopener noreferrer">
                  Open link
                </a>
              )}
            {onManual && (error.code === 'blocked' || error.code === 'no_product') && (
              <Button variant="ghost" size="sm" onClick={onManual}>
                Add manually
              </Button>
            )}
          </div>
        </div>
      )}

      <ExtractionOverlay phase={phase} platform={platform} />
    </div>
  );
}
