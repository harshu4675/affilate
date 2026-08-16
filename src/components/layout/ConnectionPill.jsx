import { useApiHealth } from '../../hooks/useApiHealth.js';

const STATUS_META = {
  online: { label: 'Extractor online', className: 'conn-online' },
  offline: { label: 'Extractor offline', className: 'conn-offline' },
  checking: { label: 'Checking extractor', className: 'conn-checking' }
};

export function ConnectionPill() {
  const status = useApiHealth();
  const meta = STATUS_META[status] || STATUS_META.checking;
  return (
    <span className={`connection-pill ${meta.className}`} title={meta.label} role="status">
      <span className="connection-dot" />
      <span className="connection-label">{meta.label}</span>
    </span>
  );
}
