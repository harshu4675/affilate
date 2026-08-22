import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { StatusBadge } from '../ui/Badge.jsx';
import { displayUrl } from '../../utils/url.js';

export function DuplicateDialog({ open, existing, onOpenExisting, onUpdateExisting, onSaveSeparate, onCancel }) {
  if (!open || !existing) return null;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Product already exists"
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={onOpenExisting}>
            Open existing
          </Button>
          <Button variant="secondary" onClick={onUpdateExisting}>
            Update existing
          </Button>
          <Button variant="primary" onClick={onSaveSeparate}>
            Save as separate
          </Button>
        </>
      }
    >
      <div className="duplicate-info">
        <p>
          This product already exists. A product with the same source link is already in your library:
        </p>
        <div className="duplicate-product card">
          <span className="duplicate-title">{existing.title}</span>
          <span className="duplicate-url">{displayUrl(existing.source && existing.source.url, 60)}</span>
          <span className="duplicate-meta">
            <StatusBadge status={existing.status} />
          </span>
        </div>
        <p className="duplicate-hint">
          Choose what to do. Saving as a separate product creates a second entry with the same source link.
        </p>
      </div>
    </Modal>
  );
}
