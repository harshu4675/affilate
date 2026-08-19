import { Section } from './Section.jsx';
import { Field, Input } from '../ui/Input.jsx';
import { PlatformBadge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../icons/Icons.jsx';
import { formatDateTime } from '../../utils/format.js';
import { displayUrl, safeExternalHref } from '../../utils/url.js';

export function SourceSection({ product, onChange, onRefresh, refreshing }) {
  const source = product.source || {};
  const href = safeExternalHref(source.url);
  return (
    <Section
      title="Source and affiliate links"
      description="Keep the clean source URL separate from the optional affiliate purchase link."
      actions={
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRefresh} loading={refreshing} disabled={!source.url}>
          {refreshing ? 'Refreshing' : 'Refresh data'}
        </Button>
      }
    >
      <div className="editor-grid">
        <Field label="Source platform" className="editor-span-2">
          <div className="source-platform-row">
            {source.platform ? (
              <PlatformBadge platformId={source.platform} label={source.platformLabel} />
            ) : (
              <span className="source-none">Not imported</span>
            )}
            {source.domain && <span className="source-domain">{source.domain}</span>}
            {href && (
              <a className="btn btn-secondary btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={14} />
                Open source
              </a>
            )}
          </div>
        </Field>
        <Field
          label="Source URL"
          htmlFor="field-sourceUrl"
          className="editor-span-2"
          hint="The clean product page used for duplicate checks and source refreshes."
        >
          <Input
            id="field-sourceUrl"
            type="url"
            value={source.url || ''}
            onChange={(event) => onChange('source', { ...source, url: event.target.value })}
            placeholder="https://store.com/product"
          />
        </Field>
        <Field
          label="Affiliate URL"
          htmlFor="field-affiliateUrl"
          className="editor-span-2"
          hint="Optional tracked purchase link. It is never used as the canonical product identity."
        >
          <Input
            id="field-affiliateUrl"
            type="url"
            value={product.affiliateUrl || ''}
            onChange={(event) => onChange('affiliateUrl', event.target.value)}
            placeholder="https://store.com/product?tag=your-affiliate-id"
          />
        </Field>
        <Field label="Product ID" htmlFor="field-productId">
          <Input
            id="field-productId"
            value={product.productId || ''}
            onChange={(event) => onChange('productId', event.target.value)}
            placeholder="Source product identifier"
          />
        </Field>
        <Field label="SKU" htmlFor="field-sku">
          <Input id="field-sku" value={product.sku || ''} onChange={(event) => onChange('sku', event.target.value)} placeholder="SKU" />
        </Field>
        <Field label="Seller" htmlFor="field-seller" className="editor-span-2">
          <Input
            id="field-seller"
            value={product.seller || ''}
            onChange={(event) => onChange('seller', event.target.value)}
            placeholder="Seller name, if publicly listed"
          />
        </Field>
      </div>
      <div className="source-meta">
        <span className="source-meta-item">
          <Icon name="clock" size={13} />
          Extracted {source.extractedAt ? formatDateTime(source.extractedAt) : '—'}
        </span>
        <span className="source-meta-item">
          <Icon name="refresh" size={13} />
          Last refreshed {source.lastRefreshedAt ? formatDateTime(source.lastRefreshedAt) : '—'}
        </span>
        <span className="source-meta-item">
          <Icon name="shield" size={13} />
          Edited fields: {product.editedFields && product.editedFields.length > 0 ? `${product.editedFields.length} manually edited` : 'none'}
        </span>
      </div>
      <p className="source-integrity-note">
        Values you edit are tracked separately from extracted data. Refreshing from the source will not silently overwrite
        fields you changed manually.
      </p>
      {source.url && <p className="source-url-line">{displayUrl(source.url, 120)}</p>}
    </Section>
  );
}
