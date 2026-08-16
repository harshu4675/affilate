import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { PlatformBadge, StatusBadge, DiscountBadge } from '../ui/Badge.jsx';
import { Icon } from '../icons/Icons.jsx';
import { formatCurrency } from '../../utils/format.js';
import { displayUrl, safeExternalHref } from '../../utils/url.js';

export function ViewProductModal({ product, onClose, onCopyLink }) {
  const navigate = useNavigate();
  if (!product) return null;
  const href = safeExternalHref(product.source && product.source.url);
  return (
    <Modal open onClose={onClose} title="Product details" width="md">
      <div className="view-product">
        <div className="view-product-media">
          {product.images && product.images[0] ? (
            <img src={product.images[0].url} alt="" />
          ) : (
            <div className="view-product-media-empty">
              <Icon name="image" size={24} />
            </div>
          )}
        </div>
        <div className="view-product-body">
          <h3 className="view-product-title">{product.title || 'Untitled product'}</h3>
          {product.brand && <p className="view-product-brand">{product.brand}</p>}
          <div className="view-product-price-row">
            {product.price != null ? (
              <>
                <span className="view-product-price">{formatCurrency(product.price, product.currency)}</span>
                {product.originalPrice != null && (
                  <span className="view-product-original">{formatCurrency(product.originalPrice, product.currency)}</span>
                )}
                <DiscountBadge percent={product.discountPercent} />
              </>
            ) : (
              <span className="table-muted">No price</span>
            )}
          </div>
          <div className="view-product-meta">
            {product.source && product.source.platform ? (
              <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
            ) : (
              <span className="source-none">Manual entry</span>
            )}
            <StatusBadge status={product.status} />
          </div>
          <div className="view-product-fields">
            {product.category && (
              <p>
                <span className="view-product-label">Category</span>
                {product.category}
              </p>
            )}
            {product.availability && (
              <p>
                <span className="view-product-label">Availability</span>
                {product.availability}
              </p>
            )}
            {product.seller && (
              <p>
                <span className="view-product-label">Seller</span>
                {product.seller}
              </p>
            )}
          </div>
          {product.description && <p className="view-product-desc">{product.description}</p>}
        </div>
      </div>
      <div className="view-product-footer">
        {product.source && product.source.url && <p className="view-product-url">{displayUrl(product.source.url, 70)}</p>}
        <div className="view-product-actions">
          <Button variant="ghost" size="sm" icon="copy" onClick={() => onCopyLink(product)}>
            Copy link
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onClose()}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="edit"
            onClick={() => {
              navigate(`/products/${product.id}`);
              onClose();
            }}
          >
            Edit product
          </Button>
        </div>
      </div>
    </Modal>
  );
}
