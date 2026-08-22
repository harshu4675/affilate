import { Section } from './Section.jsx';
import { Field, Input, Textarea } from '../ui/Input.jsx';

export function BasicInfoSection({ product, categories, onChange, errors, showErrors }) {
  const set = (field, value) => onChange(field, value);
  return (
    <Section title="Basic information" description="The core product details shown to buyers.">
      <div className="editor-grid">
        <Field
          label="Product title"
          htmlFor="field-title"
          error={showErrors && errors.title ? errors.title : undefined}
          className="editor-span-2"
        >
          <Input
            id="field-title"
            value={product.title || ''}
            onChange={(event) => set('title', event.target.value)}
            placeholder="Product name"
          />
        </Field>
        <Field label="Brand" htmlFor="field-brand">
          <Input
            id="field-brand"
            value={product.brand || ''}
            onChange={(event) => set('brand', event.target.value)}
            placeholder="Brand or manufacturer"
          />
        </Field>
        <Field label="Category" htmlFor="field-category">
          <Input
            id="field-category"
            list="category-options"
            value={product.category || ''}
            onChange={(event) => set('category', event.target.value)}
            placeholder="e.g. Electronics"
          />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
        <Field label="Subcategory" htmlFor="field-subcategory">
          <Input
            id="field-subcategory"
            value={product.subcategory || ''}
            onChange={(event) => set('subcategory', event.target.value)}
            placeholder="e.g. Headphones"
          />
        </Field>
        <Field label="Short description" htmlFor="field-short" className="editor-span-2">
          <Textarea
            id="field-short"
            rows={2}
            value={product.shortDescription || ''}
            onChange={(event) => set('shortDescription', event.target.value)}
            placeholder="A one or two sentence summary"
          />
        </Field>
        <Field label="Description" htmlFor="field-description" className="editor-span-2">
          <Textarea
            id="field-description"
            rows={6}
            value={product.description || ''}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Full product description"
          />
        </Field>
      </div>
    </Section>
  );
}
