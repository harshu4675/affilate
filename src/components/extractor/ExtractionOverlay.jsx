import { Spinner } from '../ui/Spinner.jsx';

const STAGE_LABELS = {
  validating: 'Validating URL',
  detecting: 'Detecting platform',
  extracting: 'Extracting product data',
  processing: 'Processing images'
};

export function ExtractionOverlay({ phase, platform }) {
  const active = phase === 'validating' || phase === 'detecting' || phase === 'extracting' || phase === 'processing';
  if (!active) return null;
  return (
    <div className="extraction-overlay" role="status" aria-live="polite">
      <div className="extraction-card">
        <div className="extraction-spinner">
          <Spinner size={26} />
        </div>
        <div className="extraction-title">{platform && platform.matched ? `Extracting from ${platform.label}` : 'Extracting product'}</div>
        <div className="extraction-stage">{STAGE_LABELS[phase] || 'Working'}</div>
      </div>
    </div>
  );
}
