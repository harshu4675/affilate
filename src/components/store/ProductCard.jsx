import { memo } from 'react';
import { Link } from 'react-router-dom';
import { StoreImage } from './StoreImage.jsx';
import { formatPrice } from '../../utils/format.js';

function ProductCardBase({ product, onBuy, eager = false }) {
  const image = product.images && product.images.length > 0 ? product.images[0] : null;
  const hasPrice = product.price != null;
  const hasOriginal = product.originalPrice != null && product.price != null && product.originalPrice > product.price;
  const discount = product.discountPercent;
  const storeLabel = product.store && product.store.label;

  return (
    <article className="pcard">
      <Link to={`/product/${product.id}`} className="pcard-link" aria-label={product.title || 'Product'}>
        <div className="pcard-media">
          <StoreImage src={image ? image.url : ''} alt={image && image.alt ? image.alt : product.title} eager={eager} />
          {discount != null && discount > 0 && <span className="pcard-discount">{discount}% OFF</span>}
        </div>
        <div className="pcard-body">
          {product.brand && <p className="pcard-brand">{product.brand}</p>}
          <h3 className="pcard-title">{product.title || 'Untitled product'}</h3>
          <div className="pcard-price-row">
            {hasPrice ? (
              <>
                <span className="pcard-price">{formatPrice(product.price, product.currency)}</span>
                {hasOriginal && <span className="pcard-mrp">{formatPrice(product.originalPrice, product.currency)}</span>}
              </>
            ) : (
              <span className="pcard-price-missing">See price on store</span>
            )}
          </div>
          {storeLabel && <span className="pcard-store">{storeLabel}</span>}
        </div>
      </Link>
      <button
        type="button"
        className="pcard-cta"
        onClick={() => onBuy(product)}
        disabled={!product.hasPurchaseUrl}
        title={product.hasPurchaseUrl ? `Buy ${product.title || 'this product'}` : 'Store link unavailable'}
      >
        {product.hasPurchaseUrl ? 'Buy now' : 'Link unavailable'}
      </button>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);

export function ProductCardSkeleton() {
  return (
    <div className="pcard pcard-skeleton" aria-hidden="true">
      <div className="pcard-media skeleton-block" />
      <div className="pcard-body">
        <span className="skeleton-line skeleton-line-sm" />
        <span className="skeleton-line" />
        <span className="skeleton-line skeleton-line-md" />
      </div>
    </div>
  );
}
