import { useEffect, useRef, useState } from 'react';
import { TalishhLogo } from './TalishhLogo.jsx';
import { BRAND } from '../../constants/brand.js';
import { Icon } from '../icons/Icons.jsx';

// Keep the two-step experience perceptible without slowing anyone down.
const MIN_OPENING_MS = 400;
const THANKS_MS = 750;

/**
 * Small, fast redirect experience:
 *   "Opening product..."  ->  "Thanks for shopping with Talishh"  ->  redirect.
 * Errors are shown inline instead of navigating to a broken URL.
 */
export function RedirectOverlay({ state, onClose }) {
  const [phase, setPhase] = useState('opening');
  const startedAt = useRef(0);

  useEffect(() => {
    if (!state || state.status === 'loading') {
      setPhase('opening');
      startedAt.current = Date.now();
    }
  }, [state]);

  useEffect(() => {
    if (!state || state.status !== 'ready') return undefined;
    const elapsed = Date.now() - (startedAt.current || Date.now());
    const openingDelay = Math.max(0, MIN_OPENING_MS - elapsed);
    const timers = [];
    timers.push(
      window.setTimeout(() => {
        setPhase('thanks');
        timers.push(window.setTimeout(() => window.location.assign(state.url), THANKS_MS));
      }, openingDelay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state]);

  if (!state) return null;
  const isError = state.status === 'error';

  return (
    <div className="redirect-overlay" role="dialog" aria-modal="true" aria-live="polite">
      <div className={`redirect-card${isError ? ' redirect-card-error' : ''}`}>
        {isError ? (
          <>
            <span className="redirect-error-icon">
              <Icon name="alertCircle" size={22} />
            </span>
            <h2 className="redirect-title">Store link unavailable</h2>
            <p className="redirect-text">{state.message || 'This product does not have a working store link right now.'}</p>
            <button type="button" className="redirect-close" onClick={onClose}>
              Back to shopping
            </button>
          </>
        ) : (
          <>
            <TalishhLogo size="lg" />
            {phase === 'opening' ? (
              <>
                <span className="redirect-spinner" aria-hidden="true" />
                <p className="redirect-text">Opening product{state.storeLabel ? ` on ${state.storeLabel}` : ''}...</p>
              </>
            ) : (
              <>
                <span className="redirect-check" aria-hidden="true">
                  <Icon name="check" size={20} />
                </span>
                <p className="redirect-thanks">
                  {BRAND.thanksMessage} <span aria-hidden="true">❤️</span>
                </p>
                <p className="redirect-text redirect-text-sm">Taking you to the store...</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
