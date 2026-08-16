import { Section } from './Section.jsx';
import { Field, Input } from '../ui/Input.jsx';
import { DiscountBadge } from '../ui/Badge.jsx';
import { CURRENCIES } from '../../constants/app.js';
import { computeDiscount } from '../../utils/productMerge.js';

export function PricingSection({ product, onChange, errors, showErrors }) {
  const toNumber = (value) => {
    if (value === '' || value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const discount = computeDiscount(product.price, product.originalPrice);
  const set = (field, value) => onChange(field, value);

  return (
    <Section title="Pricing" description="Prices are only ever set from real source data or your manual entry.">
      <div className="editor-grid">
        <Field
          label="Currency"
          htmlFor="field-currency"
          error={showErrors && errors.currency ? errors.currency : undefined}
        >
          <Input
            id="field-currency"
            list="currency-options"
            value={product.currency || ''}
            onChange={(event) => set('currency', event.target.value)}
            placeholder="USD"
            maxLength={3}
          />
          <datalist id="currency-options">
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency} />
            ))}
          </datalist>
        </Field>
        <Field
          label="Selling price"
          htmlFor="field-price"
          error={showErrors && errors.price ? errors.price : undefined}
        >
          <Input
            id="field-price"
            type="number"
            min="0"
            step="0.01"
            value={product.price == null ? '' : product.price}
            onChange={(event) => set('price', toNumber(event.target.value))}
            placeholder="0.00"
          />
        </Field>
        <Field
          label="Original price"
          htmlFor="field-originalPrice"
          error={showErrors && errors.originalPrice ? errors.originalPrice : undefined}
        >
          <Input
            id="field-originalPrice"
            type="number"
            min="0"
            step="0.01"
            value={product.originalPrice == null ? '' : product.originalPrice}
            onChange={(event) => set('originalPrice', toNumber(event.target.value))}
            placeholder="0.00"
          />
        </Field>
        <Field label="Discount">
          <div className="discount-display">
            {discount != null ? <DiscountBadge percent={discount} /> : <span className="discount-none">No discount</span>}
            <span className="discount-note">Calculated from the two prices above</span>
          </div>
        </Field>
        <Field label="Availability" htmlFor="field-availability">
          <Input
            id="field-availability"
            value={product.availability || ''}
            onChange={(event) => set('availability', event.target.value)}
            placeholder="e.g. In stock"
          />
        </Field>
        <Field label="Condition" htmlFor="field-condition">
          <Input
            id="field-condition"
            value={product.condition || ''}
            onChange={(event) => set('condition', event.target.value)}
            placeholder="e.g. New"
          />
        </Field>
      </div>
    </Section>
  );
}
