import { Section } from './Section.jsx';
import { IconButton, Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { createId } from '../../utils/id.js';

export function VariantsSection({ product, onChange }) {
  const variants = product.variants || [];

  const apply = (next) => onChange('variants', next);

  const update = (id, patch) => {
    apply(variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const remove = (id) => apply(variants.filter((variant) => variant.id !== id));

  const add = () => {
    apply([...variants, { id: createId('var'), type: 'Size', value: '', sku: '', price: null, compareAtPrice: null }]);
  };

  const toNumber = (value) => {
    if (value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  return (
    <Section
      title="Variants"
      description="Sizes, colors or any option a product can be bought in."
      actions={
        <span className="editor-section-count">
          {variants.length} variant{variants.length === 1 ? '' : 's'}
        </span>
      }
    >
      {variants.length === 0 ? (
        <p className="section-empty-hint">No variants extracted. Add one to list sizes, colors or other options.</p>
      ) : (
        <div className="variant-list">
          <div className="variant-row variant-row-head">
            <span>Type</span>
            <span>Value</span>
            <span>SKU</span>
            <span>Price</span>
            <span>Compare at</span>
            <span />
          </div>
          {variants.map((variant) => (
            <div className="variant-row" key={variant.id}>
              <Input
                value={variant.type}
                onChange={(event) => update(variant.id, { type: event.target.value })}
                placeholder="Size"
                aria-label="Variant type"
              />
              <Input
                value={variant.value}
                onChange={(event) => update(variant.id, { value: event.target.value })}
                placeholder="M"
                aria-label="Variant value"
              />
              <Input
                value={variant.sku || ''}
                onChange={(event) => update(variant.id, { sku: event.target.value })}
                placeholder="SKU"
                aria-label="Variant SKU"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={variant.price == null ? '' : variant.price}
                onChange={(event) => update(variant.id, { price: toNumber(event.target.value) })}
                placeholder="0.00"
                aria-label="Variant price"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={variant.compareAtPrice == null ? '' : variant.compareAtPrice}
                onChange={(event) => update(variant.id, { compareAtPrice: toNumber(event.target.value) })}
                placeholder="0.00"
                aria-label="Variant compare-at price"
              />
              <IconButton name="trash" label="Remove variant" size="sm" onClick={() => remove(variant.id)} />
            </div>
          ))}
        </div>
      )}
      <div className="section-add-row">
        <Button variant="secondary" size="sm" icon="plus" onClick={add}>
          Add variant
        </Button>
      </div>
    </Section>
  );
}
