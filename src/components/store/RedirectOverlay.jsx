import { useEffect, useRef, useState } from 'react';
import { BRAND } from '../../constants/brand.js';
import { Icon } from '../icons/Icons.jsx';

// Keep the confirmation perceptible without slowing anyone down.
const MIN_OPENING_MS = 400;
const AUTO_DISMISS_MS = 9000;

/**
 * Purchase notice.
 *
 * The store link is opened in a NEW TAB by `usePurchase`, so Talishh itself is
 * never navigated away. This component only reports what happened:
 *   "Opening product..." -> "Thanks for shopping with Talishh".
 * It is always dismissable with the X in its top-right corner (and Escape).
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
    const timers = [];
    timers.push(
      window.setTimeout(() => {
        setPhase('thanks');
        if (state.opened !== false) {
          timers.push(window.setTimeout(() => onClose && onClose(), AUTO_DISMISS_MS));
        }
      }, Math.max(0, MIN_OPENING_MS - elapsed))
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state, onClose]);

  useEffect(() => {
    if (!state) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, onClose]);

  if (!state) return null;
  const isError = state.status === 'error';
  const blocked = state.status === 'ready' && state.opened === false;

  return (
    <div className="redirect-overlay" role="status" aria-live="polite">
      <div className={`redirect-card${isError ? ' redirect-card-error' : ''}`}>
        <button type="button" className="redirect-dismiss" onClick={onClose} aria-label="Dismiss notification">
          <Icon name="close" size={15} />
        </button>

        {isError ? (
          <>
            <span className="redirect-icon redirect-icon-error">
              <Icon name="alertCircle" size={18} />
            </span>
            <div className="redirect-body">
              <p className="redirect-title">Store link unavailable</p>
              <p className="redirect-text">{state.message || 'This product does not have a working store link right now.'}</p>
              <button type="button" className="redirect-close" onClick={onClose}>
                Back to shopping
              </button>
            </div>
          </>
        ) : phase === 'opening' ? (
          <>
            <span className="redirect-icon">
              <span className="redirect-spinner" aria-hidden="true" />
            </span>
            <div className="redirect-body">
              <p className="redirect-title">Opening product{state.storeLabel ? ` on ${state.storeLabel}` : ''}...</p>
              <p className="redirect-text">A new tab is being prepared. Talishh stays open here.</p>
            </div>
          </>
        ) : (
          <>
            <span className="redirect-icon redirect-icon-done">
              <Icon name="check" size={18} />
            </span>
            <div className="redirect-body">
              <p className="redirect-thanks">
                {BRAND.thanksMessage} <span aria-hidden="true">❤️</span>
              </p>
              <p className="redirect-text">
                {blocked
                  ? 'Your browser blocked the new tab. Use the link below to continue to the store.'
                  : `${state.storeLabel || 'The store'} opened in a new tab. This page stays right where you left it.`}
              </p>
              {state.url && (
                <a className="redirect-link" href={state.url} target="_blank" rel="noopener nofollow sponsored">
                  <Icon name="external" size={14} />
                  {blocked ? 'Open the store' : 'Open the store again'}
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
