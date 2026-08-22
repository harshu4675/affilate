import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';

const GROUPS = [
  { id: 'basic', label: 'Title, description, brand and category' },
  { id: 'pricing', label: 'Price and currency' },
  { id: 'images', label: 'Images' },
  { id: 'variants', label: 'Variants' },
  { id: 'specs', label: 'Specifications and features' },
  { id: 'other', label: 'Availability, seller and condition' }
];

function available(value) {
  return value === '' || value == null ? 'Not available from source' : String(value);
}

function summary(product, group) {
  if (!product) return 'Not available from source';
  if (group === 'basic') return [product.title, product.brand, product.category].filter(Boolean).join(' · ') || 'Not available from source';
  if (group === 'pricing') {
    if (product.price == null) return 'Not available from source';
    return `${product.currency || ''} ${product.price}`.trim();
  }
  if (group === 'images') return `${(product.images || []).length} image${(product.images || []).length === 1 ? '' : 's'}`;
  if (group === 'variants') return `${(product.variants || []).length} variant${(product.variants || []).length === 1 ? '' : 's'}`;
  if (group === 'specs') return `${(product.specifications || []).length} specifications · ${(product.features || []).length} features`;
  if (group === 'other') return [product.availability, product.seller, product.condition].map(available).join(' · ');
  return 'Not available from source';
}

export function RefreshDialog({
  open,
  editedCount,
  current,
  fresh,
  selection,
  onSelectionChange,
  onRefreshAll,
  onRefreshSelected,
  onCancel,
  loading
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Compare source changes"
      width="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onRefreshAll} disabled={loading || !fresh}>
            Use all source data
          </Button>
          <Button variant="primary" onClick={onRefreshSelected} disabled={loading || !fresh || selection.length === 0}>
            Apply selected changes
          </Button>
        </>
      }
    >
      <p className="refresh-dialog-note">
        {editedCount > 0
          ? `You manually edited ${editedCount} field${editedCount === 1 ? '' : 's'}. Compare the saved values with the latest source and choose what to apply.`
          : 'Compare the saved product with the latest source. Nothing changes until you apply a selection and save the product.'}
      </p>
      <div className="refresh-comparison-head" aria-hidden="true">
        <span />
        <strong>Current data</strong>
        <strong>Latest source data</strong>
      </div>
      <div className="refresh-options refresh-comparison">
        {GROUPS.map((group) => (
          <label className="refresh-comparison-row" key={group.id}>
            <span className="refresh-comparison-choice">
              <input
                type="checkbox"
                checked={selection.includes(group.id)}
                onChange={(event) => {
                  if (event.target.checked) onSelectionChange([...selection, group.id]);
                  else onSelectionChange(selection.filter((id) => id !== group.id));
                }}
              />
              <strong>{group.label}</strong>
            </span>
            <span>{summary(current, group.id)}</span>
            <span>{summary(fresh, group.id)}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
