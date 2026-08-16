import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';

export function RefreshDialog({
  open,
  editedCount,
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
      title="Refresh product data"
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onRefreshAll} disabled={loading}>
            Refresh everything
          </Button>
          <Button variant="primary" onClick={onRefreshSelected} disabled={loading || selection.length === 0}>
            Refresh selected
          </Button>
        </>
      }
    >
      <p className="refresh-dialog-note">
        {editedCount > 0
          ? `This product has ${editedCount} field${editedCount === 1 ? '' : 's'} you edited manually. Refreshing can overwrite those values.`
          : 'Re-extract the latest data from the source URL.'}
      </p>
      <div className="refresh-options">
        {[
          { id: 'basic', label: 'Title, description, brand and category' },
          { id: 'pricing', label: 'Price and currency' },
          { id: 'images', label: 'Images' },
          { id: 'variants', label: 'Variants' },
          { id: 'specs', label: 'Specifications and features' },
          { id: 'other', label: 'Availability, seller and condition' }
        ].map((group) => (
          <label className="checkbox-row" key={group.id}>
            <input
              type="checkbox"
              checked={selection.includes(group.id)}
              onChange={(event) => {
                if (event.target.checked) onSelectionChange([...selection, group.id]);
                else onSelectionChange(selection.filter((id) => id !== group.id));
              }}
            />
            <span>{group.label}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
