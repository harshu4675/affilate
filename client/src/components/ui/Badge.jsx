import { STATUS_LABELS } from '../../constants/app.js';
import { getPlatform } from '../../constants/platforms.js';

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const toneMap = {
    draft: 'neutral',
    ready: 'info',
    published: 'success',
    archived: 'muted'
  };
  return <Badge tone={toneMap[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>;
}

export function PlatformBadge({ platformId, label }) {
  const platform = getPlatform(platformId);
  return (
    <span className="platform-badge">
      <span className="platform-dot" style={{ backgroundColor: platform.color }} />
      <span className="platform-label">{label || platform.label}</span>
    </span>
  );
}

export function DiscountBadge({ percent }) {
  if (percent == null) return null;
  return <span className="discount-badge">{percent}% off</span>;
}
