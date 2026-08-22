import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StoreImage } from '../../components/store/StoreImage.jsx';
import { RedirectOverlay } from '../../components/store/RedirectOverlay.jsx';
import { ShareProduct } from '../../components/store/ShareProduct.jsx';
import { Icon } from '../../components/icons/Icons.jsx';
import { usePurchase } from '../../hooks/usePurchase.js';
import { fetchStoreProduct, fetchRelatedProducts } from '../../services/catalogApi.js';
import { formatPrice } from '../../utils/format.js';
import { BRAND } from '../../constants/brand.js';

export function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState(null);
  const { purchaseState, buy, reset } = usePurchase();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setActiveImage(0);
    setRelated(null);
    // Clear any notice left over from a previous product.
    reset();
    window.scrollTo({ top: 0, behavior: 'auto' });
    fetchStoreProduct(id)
      .then((data) => {
        if (!active) return;
        setProduct(data.product);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err && err.code === 'not_found' ? 'This product is no longer available.' : (err && err.message) || 'Could not load this product.');
        setStatus('error');
      });
    // Related products are a secondary fetch: failures never break the page.
    fetchRelatedProducts(id)
      .then((data) => {
        if (!active) return;
        setRelated(Array.isArray(data.related) ? data.related : []);
      })
      .catch(() => {
        if (!active) return;
        setRelated([]);
      });
    return () => {
      active = false;
    };
  }, [id, reset]);

  if (status === 'loading') {
    return (
      <div className="pdp pdp-loading">
        <div className="pdp-layout">
          <div className="pdp-gallery">
            <div className="pdp-main-image skeleton-block" />
          </div>
          <div className="pdp-info">
            <span className="skeleton-line skeleton-line-sm" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-md" />
            <span className="skeleton-line skeleton-line-md" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !product) {
    return (
      <div className="store-state store-state-error">
        <Icon name="alertCircle" size={22} />
        <h2>Product unavailable</h2>
        <p>{error}</p>
        <Link to="/" className="store-primary-btn">
          Browse all products
        </Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];
  const image = images[activeImage] || images[0] || null;
  const hasOriginal = product.originalPrice != null && product.price != null && product.originalPrice > product.price;
  const hasDiscount = product.discountPercent != null && product.discountPercent > 0;

  return (
    <div className="pdp">
      <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">All products</Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/?q=${encodeURIComponent(product.category)}`}>{product.category}</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="pdp-breadcrumb-current">{product.title || 'Product'}</span>
      </nav>

      <div className="pdp-layout">
        <div className="pdp-gallery">
          <div className="pdp-main-image">
            <StoreImage src={image ? image.url : ''} alt={(image && image.alt) || product.title} eager />
            {hasDiscount && <span className="pdp-discount">{product.discountPercent}% off</span>}
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbs" role="list">
              {images.map((item, index) => (
                <button
                  key={item.url}
                  type="button"
                  role="listitem"
                  className={`pdp-thumb${index === activeImage ? ' pdp-thumb-active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={index === activeImage}
                >
                  <StoreImage src={item.url} alt="" eager={index < 5} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pdp-info">
          <div className="pdp-head">
            <div className="pdp-eyebrow">
              {product.brand && <span className="pdp-brand">{product.brand}</span>}
              {product.brand && product.category && <span className="pdp-eyebrow-sep" aria-hidden="true" />}
              {product.category && <span className="pdp-category">{product.category}</span>}
            </div>
            <h1 className="pdp-title">{product.title || 'Untitled product'}</h1>
            <div className="pdp-meta">
              {product.store && product.store.label && (
                <span className="pdp-chip pdp-chip-store">
                  <Icon name="store" size={13} /> {product.store.label}
                </span>
              )}
              {product.availability && <span className="pdp-chip">{product.availability}</span>}
              {product.condition && <span className="pdp-chip">{product.condition}</span>}
            </div>
          </div>

          <div className="pdp-buybox">
            <div className="pdp-price-row">
              {product.price != null ? (
                <>
                  <span className="pdp-price">{formatPrice(product.price, product.currency)}</span>
                  {hasOriginal && <span className="pdp-mrp">{formatPrice(product.originalPrice, product.currency)}</span>}
                  {hasDiscount && <span className="pdp-save">Save {product.discountPercent}%</span>}
                </>
              ) : (
                <span className="pcard-price-missing">Price shown on the store</span>
              )}
            </div>

            <div className="pdp-actions">
              <button type="button" className="pdp-buy" onClick={() => buy(product)} disabled={!product.hasPurchaseUrl}>
                <Icon name="zap" size={16} />
                {product.hasPurchaseUrl ? 'Buy now' : 'Store link unavailable'}
              </button>
              <ShareProduct title={product.title} />
            </div>

            <p className="pdp-note">
              <Icon name="shield" size={13} />
              <span>{BRAND.supportNote} The store opens in a new tab.</span>
            </p>
          </div>

          {product.shortDescription && <p className="pdp-summary">{product.shortDescription}</p>}

          {product.features && product.features.length > 0 && (
            <section className="pdp-section">
              <h2>Highlights</h2>
              <ul className="pdp-features">
                {product.features.map((feature, index) => (
                  <li key={`${index}-${feature.slice(0, 12)}`}>{feature}</li>
                ))}
              </ul>
            </section>
          )}

          {product.description && (
            <section className="pdp-section">
              <h2>About this product</h2>
              <p className="pdp-description">{product.description}</p>
            </section>
          )}

          {product.specifications && product.specifications.length > 0 && (
            <section className="pdp-section">
              <h2>Specifications</h2>
              <dl className="pdp-specs">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="pdp-spec">
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="pdp-related" aria-label="You may also like">
          <h2 className="pdp-related-title">You may also like</h2>
          <div className="pdp-related-row">
            {related.map((item) => (
              <Link key={item.id} to={`/product/${item.id}`} className="related-card">
                <div className="related-card-media">
                  <StoreImage src={item.images && item.images[0] ? item.images[0].url : ''} alt={item.title || ''} />
                  {item.discountPercent != null && item.discountPercent > 0 && (
                    <span className="related-card-discount-badge">{item.discountPercent}% off</span>
                  )}
                </div>
                <div className="related-card-body">
                  <p className="related-card-title">{item.title || 'Untitled product'}</p>
                  <div className="related-card-price">
                    {item.price != null ? (
                      <>
                        <span className="related-card-amount">{formatPrice(item.price, item.currency)}</span>
                        {item.originalPrice != null && item.originalPrice > item.price && (
                          <span className="related-card-mrp">{formatPrice(item.originalPrice, item.currency)}</span>
                        )}
                      </>
                    ) : (
                      <span className="related-card-missing">Price shown on the store</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RedirectOverlay state={purchaseState} onClose={reset} />
    </div>
  );
}
