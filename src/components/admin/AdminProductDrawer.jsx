import { useEffect, useState } from 'react';
import { StoreImage } from '../store/StoreImage.jsx';
import { Icon } from '../icons/Icons.jsx';
import { useToast } from '../ui/ToastProvider.jsx';
import { formatPrice } from '../../utils/format.js';

const EMPTY = {
  title: '',
  brand: '',
  category: '',
  currency: '',
  price: '',
  originalPrice: '',
  affiliateUrl: '',
  shortDescription: '',
  visible: true
};

function toForm(product) {
  if (!product) return EMPTY;
  return {
    title: product.title || '',
    brand: product.brand || '',
    category: product.category || '',
    currency: product.currency || '',
    price: product.price != null ? String(product.price) : '',
    originalPrice: product.originalPrice != null ? String(product.originalPrice) : '',
    affiliateUrl: product.affiliateUrl || '',
    shortDescription: product.shortDescription || '',
    visible: product.visible !== false
  };
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AdminProductDrawer({ product, onClose, onSave }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(toForm(product));
    setErrors({});
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose, busy]);

  if (!product) return null;

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'A product title is required.';
    if (form.price !== '' && !(Number(form.price) >= 0)) nextErrors.price = 'Enter a valid price.';
    if (form.originalPrice !== '' && !(Number(form.originalPrice) >= 0)) nextErrors.originalPrice = 'Enter a valid price.';
    if (!isValidUrl(form.affiliateUrl.trim())) nextErrors.affiliateUrl = 'Enter a valid http(s) URL.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      await onSave(product.id, {
        title: form.title.trim(),
        brand: form.brand.trim(),
        category: form.category.trim(),
        currency: form.currency.trim().toUpperCase(),
        price: form.price === '' ? null : Number(form.price),
        originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
        affiliateUrl: form.affiliateUrl.trim(),
        shortDescription: form.shortDescription.trim(),
        visible: form.visible
      });
      onClose();
    } catch (err) {
      toast.error((err && err.message) || 'The product could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const previewPrice = form.price === '' ? null : Number(form.price);
  const previewMrp = form.originalPrice === '' ? null : Number(form.originalPrice);
  const sourceUrl = (product.source && (product.source.originalUrl || product.source.url)) || '';

  return (
    <div className="admin-drawer-backdrop" role="presentation" onMouseDown={() => !busy && onClose()}>
      <aside
        className="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Edit product"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-drawer-head">
          <h2>Edit product</h2>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="admin-drawer-body">
          <div className="admin-preview">
            <span className="admin-preview-media">
              <StoreImage src={product.images[0] ? product.images[0].url : ''} alt="" eager />
            </span>
            <div className="admin-preview-info">
              <p className="admin-preview-title">{form.title || 'Untitled product'}</p>
              <p className="admin-preview-price">
                {previewPrice != null ? formatPrice(previewPrice, form.currency) : 'No price'}
                {previewMrp != null && previewMrp > (previewPrice || 0) && (
                  <span className="admin-price-mrp">{formatPrice(previewMrp, form.currency)}</span>
                )}
              </p>
              <p className="admin-preview-meta">{product.source.platformLabel}</p>
            </div>
          </div>

          <form className="admin-form" onSubmit={submit} id="admin-product-form">
            <label className="admin-field">
              <span>Title</span>
              <input type="text" value={form.title} onChange={set('title')} maxLength={400} />
              {errors.title && <em className="admin-field-error">{errors.title}</em>}
            </label>

            <div className="admin-field-row">
              <label className="admin-field">
                <span>Brand</span>
                <input type="text" value={form.brand} onChange={set('brand')} maxLength={120} />
              </label>
              <label className="admin-field">
                <span>Category</span>
                <input type="text" value={form.category} onChange={set('category')} maxLength={120} />
              </label>
            </div>

            <div className="admin-field-row">
              <label className="admin-field">
                <span>Price</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
                {errors.price && <em className="admin-field-error">{errors.price}</em>}
              </label>
              <label className="admin-field">
                <span>Original price</span>
                <input type="number" min="0" step="0.01" value={form.originalPrice} onChange={set('originalPrice')} />
                {errors.originalPrice && <em className="admin-field-error">{errors.originalPrice}</em>}
              </label>
              <label className="admin-field admin-field-narrow">
                <span>Currency</span>
                <input type="text" value={form.currency} onChange={set('currency')} maxLength={8} placeholder="INR" />
              </label>
            </div>

            <label className="admin-field">
              <span>Affiliate URL</span>
              <input
                type="url"
                value={form.affiliateUrl}
                onChange={set('affiliateUrl')}
                placeholder="https://..."
                inputMode="url"
              />
              {errors.affiliateUrl ? (
                <em className="admin-field-error">{errors.affiliateUrl}</em>
              ) : (
                <em className="admin-field-hint">
                  Used first for the Buy button. Leave empty to fall back to the imported source URL.
                </em>
              )}
            </label>

            <label className="admin-field">
              <span>Short description</span>
              <textarea rows={3} value={form.shortDescription} onChange={set('shortDescription')} maxLength={600} />
            </label>

            <label className="admin-toggle">
              <input type="checkbox" checked={form.visible} onChange={set('visible')} />
              <span>Visible on the storefront</span>
            </label>

            <div className="admin-readonly">
              <h3>Imported data (read only)</h3>
              <dl>
                <div>
                  <dt>Source URL</dt>
                  <dd>
                    {sourceUrl ? (
                      <a href={sourceUrl} target="_blank" rel="noreferrer noopener">
                        {sourceUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Store</dt>
                  <dd>{product.source.platformLabel}</dd>
                </div>
                <div>
                  <dt>Images</dt>
                  <dd>{product.images.length}</dd>
                </div>
                <div>
                  <dt>Product ID</dt>
                  <dd>{product.productId || product.sku || '—'}</dd>
                </div>
              </dl>
            </div>
          </form>
        </div>

        <footer className="admin-drawer-foot">
          <button type="button" className="admin-ghost-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="admin-product-form" className="admin-primary-btn" disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
