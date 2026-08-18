import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../state/AppProvider.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { UrlExtractor } from '../../components/extractor/UrlExtractor.jsx';
import { StoreImage } from '../../components/store/StoreImage.jsx';
import { Icon } from '../../components/icons/Icons.jsx';
import { createProductFromExtraction } from '../../state/productFactory.js';
import { adminPublish, adminProducts } from '../../services/catalogApi.js';
import { formatPrice, formatDate } from '../../utils/format.js';

/**
 * Bridges the existing (unchanged) import library into the storefront catalog.
 * The extractor component, product factory and localStorage library are reused
 * exactly as-is; this page only publishes those records to the server catalog.
 */
export function AdminImportPage() {
  const { products, setDraft, addHistory } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [selection, setSelection] = useState(() => new Set());
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(null);
  const [loadingPublished, setLoadingPublished] = useState(false);

  const loadPublished = async () => {
    setLoadingPublished(true);
    try {
      const data = await adminProducts();
      setPublished(new Set((data.products || []).map((item) => item.id)));
    } catch {
      setPublished(null);
    } finally {
      setLoadingPublished(false);
    }
  };

  useMemo(() => {
    loadPublished();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExtracted = (data) => {
    const product = createProductFromExtraction(data);
    const stored = setDraft(product);
    if (!stored.ok) {
      toast.error(stored.message || 'The extracted draft could not be stored.');
      return;
    }
    addHistory({
      url: data.source.url,
      platform: data.source.platform,
      status: data.source.partial ? 'partial' : 'success',
      productId: product.id,
      title: product.title || data.source.url,
      extractedAt: new Date().toISOString()
    });
    if (data.source.partial) toast.warning('Product extracted with partial data. Review before saving.');
    else toast.success('Product extracted. Review and save it to your library.');
    navigate('/products/new');
  };

  const toggle = (id) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = products.length > 0 && products.every((item) => selection.has(item.id));
  const toggleAll = () => setSelection(allSelected ? new Set() : new Set(products.map((item) => item.id)));

  const publish = async (list, label) => {
    if (list.length === 0) {
      toast.error('Select at least one product to publish.');
      return;
    }
    setPublishing(true);
    try {
      const result = await adminPublish(list);
      toast.success(`${result.published} ${label} published. Catalog now has ${result.total} product${result.total === 1 ? '' : 's'}.`);
      setSelection(new Set());
      await loadPublished();
    } catch (err) {
      toast.error((err && err.message) || 'Products could not be published.');
    } finally {
      setPublishing(false);
    }
  };

  const selectedProducts = products.filter((item) => selection.has(item.id));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Import &amp; publish</h1>
          <p className="admin-subtitle">Extract products with the existing importer, then publish them to the storefront.</p>
        </div>
        <Link to="/library" className="admin-ghost-btn">
          <Icon name="list" size={15} />
          Open full library
        </Link>
      </div>

      <section className="admin-card admin-import-card">
        <div className="admin-card-head">
          <h2>Import a product</h2>
          <span className="admin-muted admin-muted-sm">Paste any store or affiliate product link</span>
        </div>
        <UrlExtractor onResult={handleExtracted} onManual={() => navigate('/products/new')} />
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Library products</h2>
            <span className="admin-muted admin-muted-sm">
              {products.length} product{products.length === 1 ? '' : 's'} saved in this browser
              {loadingPublished ? ' · checking catalog...' : ''}
            </span>
          </div>
          <div className="admin-head-actions">
            <button
              type="button"
              className="admin-ghost-btn"
              disabled={publishing || products.length === 0}
              onClick={() => publish(products, 'products')}
            >
              <Icon name="upload" size={15} />
              Publish all
            </button>
            <button
              type="button"
              className="admin-primary-btn"
              disabled={publishing || selection.size === 0}
              onClick={() => publish(selectedProducts, 'products')}
            >
              {publishing ? 'Publishing...' : `Publish selected${selection.size ? ` (${selection.size})` : ''}`}
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="admin-state">
            <Icon name="box" size={22} />
            <h2>Your library is empty</h2>
            <p>Import a product with the form above. Saved products appear here, ready to publish.</p>
          </div>
        ) : (
          <>
            <label className="admin-selectall">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>Select all</span>
            </label>
            <ul className="admin-publish-list">
              {products.map((product) => {
                const image = (product.images || []).find((item) => item.isPrimary) || (product.images || [])[0];
                const isPublished = published ? published.has(product.id) : false;
                return (
                  <li key={product.id} className="admin-publish-item">
                    <input
                      type="checkbox"
                      checked={selection.has(product.id)}
                      onChange={() => toggle(product.id)}
                      aria-label={`Select ${product.title || 'product'}`}
                    />
                    <span className="admin-thumb">
                      <StoreImage src={image ? image.url : ''} alt="" />
                    </span>
                    <div className="admin-publish-main">
                      <Link to={`/products/${product.id}`} className="admin-product-title">
                        {product.title || 'Untitled product'}
                      </Link>
                      <span className="admin-product-meta">
                        {product.source && product.source.platformLabel && <span>{product.source.platformLabel}</span>}
                        {product.price != null && <span>{formatPrice(product.price, product.currency)}</span>}
                        <span>{formatDate(product.updatedAt)}</span>
                      </span>
                    </div>
                    <span className={`admin-pill admin-pill-${isPublished ? 'success' : 'muted'}`}>
                      {isPublished ? 'In catalog' : 'Not published'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
