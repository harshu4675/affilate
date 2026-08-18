import { Spinner } from '../ui/Spinner.jsx';
import { Icon } from '../icons/Icons.jsx';

const STAGES = [
  { id: 'validating', label: 'Validating URL' },
  { id: 'detecting', label: 'Detecting platform' },
  { id: 'extracting', label: 'Extracting product' },
  { id: 'processing', label: 'Processing images' },
  { id: 'preparing', label: 'Preparing product' }
];

export function ExtractionOverlay({ phase, platform }) {
  const activeIndex = STAGES.findIndex((stage) => stage.id === phase);
  if (activeIndex < 0) return null;
  return (
    <div className="extraction-overlay" role="status" aria-live="polite" aria-label={STAGES[activeIndex].label}>
      <div className="extraction-card">
        <div className="extraction-spinner">
          <Spinner size={26} />
        </div>
        <div className="extraction-title">{platform && platform.matched ? `Importing from ${platform.label}` : 'Preparing your import'}</div>
        <div className="extraction-stage">{STAGES[activeIndex].label}</div>
        <ol className="extraction-stage-list">
          {STAGES.map((stage, index) => (
            <li
              key={stage.id}
              className={`extraction-stage-item${index < activeIndex ? ' is-complete' : ''}${index === activeIndex ? ' is-active' : ''}`}
            >
              <span className="extraction-stage-marker">
                {index < activeIndex ? <Icon name="check" size={11} /> : <span />}
              </span>
              <span>{stage.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
