import { PlatformBadge, StatusBadge, DiscountBadge } from '../ui/Badge.jsx';
import { Icon } from '../icons/Icons.jsx';
import { SafeImage } from '../ui/SafeImage.jsx';
import { formatCurrency } from '../../utils/format.js';
import { displayUrl, safeExternalHref } from '../../utils/url.js';

export function ProductPreview({ product }) {
  const primary = (product.images || []).find((image) => image.isPrimary) || (product.images || [])[0];
  const href = safeExternalHref(product.source && product.source.url);
  const variants = product.variants || [];
  const specifications = product.specifications || [];

  return (
    <div className="product-preview card">
      <div className="preview-image-wrap">
        {primary ? (
          <SafeImage className="preview-image" src={primary.url} alt={primary.alt || product.title || 'Product'} />
        ) : (
          <div className="preview-image-placeholder">
            <Icon name="image" size={26} />
            <span>No image</span>
          </div>
        )}
        {(product.images || []).length > 1 && (
          <span className="preview-image-count">
            <Icon name="image" size={12} />
            {(product.images || []).length}
          </span>
        )}
      </div>
      <div className="preview-body">
        <h4 className="preview-title">{product.title || 'Untitled product'}</h4>
        {product.brand && <p className="preview-brand">{product.brand}</p>}
        <div className="preview-price-row">
          {product.price != null ? (
            <>
              <span className="preview-price">{formatCurrency(product.price, product.currency)}</span>
              {product.originalPrice != null && (
                <span className="preview-original-price">{formatCurrency(product.originalPrice, product.currency)}</span>
              )}
              <DiscountBadge percent={product.discountPercent} />
            </>
          ) : (
            <span className="preview-price preview-price-empty">Price not set</span>
          )}
        </div>
        {product.shortDescription && <p className="preview-short">{product.shortDescription}</p>}
        {product.description && <p className="preview-desc">{product.description}</p>}
        {variants.length > 0 && (
          <div className="preview-variants">
            <span className="preview-label">Variants</span>
            <div className="preview-variant-chips">
              {variants.slice(0, 8).map((variant) => (
                <span className="preview-variant-chip" key={variant.id}>
                  {variant.value || variant.type}
                </span>
              ))}
              {variants.length > 8 && <span className="preview-variant-chip preview-variant-more">+{variants.length - 8}</span>}
            </div>
          </div>
        )}
        {specifications.length > 0 && (
          <div className="preview-specs">
            <span className="preview-label">Specifications</span>
            <ul className="preview-spec-list">
              {specifications.slice(0, 5).map((spec) => (
                <li key={spec.id}>
                  <span className="preview-spec-label">{spec.label}</span>
                  <span className="preview-spec-value">{spec.value}</span>
                </li>
              ))}
              {specifications.length > 5 && <li className="preview-spec-more">+{specifications.length - 5} more</li>}
            </ul>
          </div>
        )}
        <div className="preview-source">
          {product.source && product.source.platform ? (
            <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
          ) : (
            <span className="source-none">Not imported</span>
          )}
          {product.source && product.source.domain && <span className="preview-domain">{product.source.domain}</span>}
        </div>
        <div className="preview-footer">
          <StatusBadge status={product.status} />
          <a
            className={`btn btn-primary btn-sm${href ? '' : ' btn-disabled'}`}
            href={href || undefined}
            target={href ? '_blank' : undefined}
            rel={href ? 'noopener noreferrer' : undefined}
            aria-disabled={!href}
          >
            <Icon name="external" size={14} />
            {product.source && product.source.platformLabel ? `Buy on ${product.source.platformLabel}` : 'Buy product'}
          </a>
        </div>
        {product.source && product.source.url && <p className="preview-url">{displayUrl(product.source.url, 64)}</p>}
      </div>
    </div>
  );
}
