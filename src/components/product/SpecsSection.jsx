import { Section } from './Section.jsx';
import { IconButton, Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { createId } from '../../utils/id.js';

export function SpecsSection({ product, onChange }) {
  const specifications = product.specifications || [];

  const applySpecs = (next) => onChange('specifications', next);

  const updateSpec = (id, patch) => {
    applySpecs(specifications.map((spec) => (spec.id === id ? { ...spec, ...patch } : spec)));
  };

  const removeSpec = (id) => applySpecs(specifications.filter((spec) => spec.id !== id));

  const addSpec = () => {
    applySpecs([...specifications, { id: createId('spec'), label: '', value: '' }]);
  };

  const features = product.features || [];
  const applyFeatures = (next) => onChange('features', next);

  const updateFeature = (index, value) => {
    const next = [...features];
    next[index] = value;
    applyFeatures(next);
  };

  const removeFeature = (index) => applyFeatures(features.filter((_, i) => i !== index));

  const addFeature = () => applyFeatures([...features, '']);

  return (
    <>
      <Section
        title="Specifications"
        description="Technical attributes and key details."
        actions={
          <span className="editor-section-count">
            {specifications.length} item{specifications.length === 1 ? '' : 's'}
          </span>
        }
      >
        {specifications.length === 0 ? (
          <p className="section-empty-hint">No specifications extracted. Add label and value pairs.</p>
        ) : (
          <div className="spec-list">
            {specifications.map((spec) => (
              <div className="spec-row" key={spec.id}>
                <Input
                  value={spec.label}
                  onChange={(event) => updateSpec(spec.id, { label: event.target.value })}
                  placeholder="Label, e.g. Material"
                  aria-label="Specification label"
                />
                <Input
                  value={spec.value}
                  onChange={(event) => updateSpec(spec.id, { value: event.target.value })}
                  placeholder="Value, e.g. Stainless steel"
                  aria-label="Specification value"
                />
                <IconButton name="trash" label="Remove specification" size="sm" onClick={() => removeSpec(spec.id)} />
              </div>
            ))}
          </div>
        )}
        <div className="section-add-row">
          <Button variant="secondary" size="sm" icon="plus" onClick={addSpec}>
            Add specification
          </Button>
        </div>
      </Section>

      <Section
        title="Features"
        description="Short highlight points, one per line."
        actions={
          <span className="editor-section-count">
            {features.length} feature{features.length === 1 ? '' : 's'}
          </span>
        }
      >
        {features.length === 0 ? (
          <p className="section-empty-hint">No features extracted. Add highlights if the source lists any.</p>
        ) : (
          <div className="feature-list">
            {features.map((feature, index) => (
              <div className="feature-row" key={index}>
                <Input
                  value={feature}
                  onChange={(event) => updateFeature(index, event.target.value)}
                  placeholder="Feature highlight"
                  aria-label="Feature"
                />
                <IconButton name="trash" label="Remove feature" size="sm" onClick={() => removeFeature(index)} />
              </div>
            ))}
          </div>
        )}
        <div className="section-add-row">
          <Button variant="secondary" size="sm" icon="plus" onClick={addFeature}>
            Add feature
          </Button>
        </div>
      </Section>
    </>
  );
}
