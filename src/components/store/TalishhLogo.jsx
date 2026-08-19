import { BRAND } from '../../constants/brand.js';

/**
 * Talishh wordmark. Minimal, responsive, and readable at small sizes:
 * a rounded bag glyph with a "T" cut, followed by the wordmark.
 */
export function TalishhLogo({ size = 'md', showWordmark = true, className = '' }) {
  return (
    <span className={`talishh-logo talishh-logo-${size} ${className}`.trim()} aria-label={BRAND.name}>
      <span className="talishh-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" role="presentation" focusable="false">
          <rect width="32" height="32" rx="7" fill="currentColor" />
          <path d="M6.8 10.5h18.4l-1.9 15.2a3 3 0 0 1-3 2.6H11.7a3 3 0 0 1-3-2.6z" fill="var(--talishh-mark-cut, #fff)" />
          <path
            d="M11.4 12.2V8.6a4.6 4.6 0 0 1 9.2 0v3.6"
            stroke="var(--talishh-mark-cut, #fff)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M12.4 16.7h7.2M16 16.7v6.3" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark && <span className="talishh-logo-word">{BRAND.name}</span>}
    </span>
  );
}
