import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminCatalog } from '../../hooks/useAdminCatalog.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { StoreImage } from '../../components/store/StoreImage.jsx';
import { Icon } from '../../components/icons/Icons.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { AdminProductDrawer } from '../../components/admin/AdminProductDrawer.jsx';
import { adminBulk, adminDeleteProduct, adminUpdateProduct } from '../../services/catalogApi.js';
import { formatPrice, formatDate } from '../../utils/format.js';
import { displayUrl } from '../../utils/url.js';

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'alpha', label: 'Title A to Z' }
];

export function AdminProductsPage() {
  const { products, status, error, reload, storage } = useAdminCatalog();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [storeFilter, setStoreFilter] = useState('');
  const [visibility, setVisibility] = useState('');
  const [sort, setSort] = useState('newest');
  const [selection, setSelection] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const stores = useMemo(() => {
    const map = new Map();
    for (const item of products) {
      const id = (item.source && item.source.platform) || 'generic';
      if (!map.has(id)) map.set(id, (item.source && item.source.platformLabel) || 'Store');
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    let list = products.filter((item) => {
      if (!needle) return true;
      return [item.title, item.brand, item.category, item.source && item.source.domain, item.sku]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    if (storeFilter) list = list.filter((item) => item.source && item.source.platform === storeFilter);
    if (visibility === 'visible') list = list.filter((item) => item.visible !== false);
    if (visibility === 'hidden') list = list.filter((item) => item.visible === false);
    const sorters = {
      newest: (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
      oldest: (a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0),
      price_desc: (a, b) => (b.price == null ? -Infinity : b.price) - (a.price == null ? -Infinity : a.price),
      price_asc: (a, b) => (a.price == null ? Infinity : a.price) - (b.price == null ? Infinity : b.price),
      alpha: (a, b) => (a.title || '').localeCompare(b.title || '')
    };
    return [...list].sort(sorters[sort] || sorters.newest);
  }, [products, debouncedQuery, storeFilter, visibility, sort]);

  const hasFilters = Boolean(query || storeFilter || visibility);
  const allSelected = filtered.length > 0 && filtered.every((item) => selection.has(item.id));

  const toggle = (id) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelection((prev) => (allSelected ? new Set() : new Set(filtered.map((item) => item.id))));

  const clearFilters = () => {
    setQuery('');
    setStoreFilter('');
    setVisibility('');
  };

  const toggleVisibility = async (product) => {
    setBusyId(product.id);
    try {
      await adminUpdateProduct(product.id, { visible: product.visible === false });
      toast.success(product.visible === false ? 'Product is now visible.' : 'Product hidden from the storefront.');
      await reload();
    } catch (err) {
      toast.error((err && err.message) || 'Visibility could not be changed.');
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (id, patch) => {
    await adminUpdateProduct(id, patch);
    toast.success('Product updated.');
    await reload();
  };

  const runDelete = async () => {
    if (!confirm) return;
    setBulkBusy(true);
    try {
      if (confirm.ids.length === 1) await adminDeleteProduct(confirm.ids[0]);
      else await adminBulk('delete', confirm.ids);
      toast.success(confirm.ids.length === 1 ? 'Product deleted.' : `${confirm.ids.length} products deleted.`);
      setSelection(new Set());
      setConfirm(null);
      await reload();
    } catch (err) {
      toast.error((err && err.message) || 'Products could not be deleted.');
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkVisibility = async (action) => {
    setBulkBusy(true);
    try {
      await adminBulk(action, [...selection]);
      toast.success(`${selection.size} product${selection.size === 1 ? '' : 's'} ${action === 'show' ? 'shown' : 'hidden'}.`);
      setSelection(new Set());
      await reload();
    } catch (err) {
      toast.error((err && err.message) || 'Products could not be updated.');
    } finally {
      setBulkBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="admin-page">
        <div className="admin-title-skeleton skeleton-line skeleton-line-md" />
        <div className="admin-card">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="admin-row-skeleton skeleton-block" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="admin-page">
        <div className="admin-state admin-state-error">
          <Icon name="alertCircle" size={22} />
          <h2>Could not load products</h2>
          <p>{error}</p>
          <button type="button" className="admin-primary-btn" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Products</h1>
          <p className="admin-subtitle">
            {products.length} product{products.length === 1 ? '' : 's'} in the storefront catalog
          </p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-ghost-btn" onClick={reload}>
            <Icon name="refresh" size={15} />
            Refresh
          </button>
          <Link to="/admin/import" className="admin-primary-btn">
            <Icon name="upload" size={15} />
            Import &amp; publish
          </Link>
        </div>
      </div>

      {storage && storage.writable === false && (
        <div className="admin-alert admin-alert-danger" role="alert">
          <Icon name="alertTriangle" size={16} />
          <span>The catalog file is not writable. Changes will not persist until this is fixed on the server.</span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="admin-state">
          <Icon name="box" size={22} />
          <h2>No products in the catalog</h2>
          <p>Publish products from your import library to make them visible on the Talishh storefront.</p>
          <Link to="/admin/import" className="admin-primary-btn">
            Go to import &amp; publish
          </Link>
        </div>
      ) : (
        <>
          <div className="admin-toolbar">
            <div className="admin-search">
              <Icon name="search" size={15} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, brand, category or domain"
                aria-label="Search products"
              />
            </div>
            <select value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)} aria-label="Filter by store">
              <option value="">All stores</option>
              {stores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Filter by visibility">
              <option value="">All visibility</option>
              <option value="visible">Visible only</option>
              <option value="hidden">Hidden only</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
              {SORTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button type="button" className="admin-ghost-btn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>

          {selection.size > 0 && (
            <div className="admin-bulkbar">
              <span>
                {selection.size} selected
                <button type="button" onClick={() => setSelection(new Set())}>
                  Clear
                </button>
              </span>
              <div className="admin-bulk-actions">
                <button type="button" className="admin-ghost-btn" disabled={bulkBusy} onClick={() => runBulkVisibility('show')}>
                  <Icon name="eye" size={14} /> Show
                </button>
                <button type="button" className="admin-ghost-btn" disabled={bulkBusy} onClick={() => runBulkVisibility('hide')}>
                  <Icon name="cloudOff" size={14} /> Hide
                </button>
                <button
                  type="button"
                  className="admin-danger-btn"
                  disabled={bulkBusy}
                  onClick={() => setConfirm({ ids: [...selection], label: `${selection.size} selected products` })}
                >
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="admin-state">
              <Icon name="search" size={22} />
              <h2>No matching products</h2>
              <p>Try a different search term or clear the filters.</p>
              <button type="button" className="admin-primary-btn" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="admin-card admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-col-check">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all products" />
                    </th>
                    <th>Product</th>
                    <th className="admin-col-price">Price</th>
                    <th className="admin-col-store">Store</th>
                    <th className="admin-col-links">Links</th>
                    <th className="admin-col-status">Status</th>
                    <th className="admin-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const affiliate = product.affiliateUrl || '';
                    const original = (product.source && (product.source.originalUrl || product.source.url)) || '';
                    return (
                      <tr key={product.id} className={selection.has(product.id) ? 'admin-row-selected' : ''}>
                        <td className="admin-col-check">
                          <input
                            type="checkbox"
                            checked={selection.has(product.id)}
                            onChange={() => toggle(product.id)}
                            aria-label={`Select ${product.title || 'product'}`}
                          />
                        </td>
                        <td>
                          <div className="admin-product-cell">
                            <span className="admin-thumb">
                              <StoreImage src={product.images[0] ? product.images[0].url : ''} alt="" />
                            </span>
                            <div className="admin-product-main">
                              <button type="button" className="admin-product-title" onClick={() => setEditing(product)}>
                                {product.title || 'Untitled product'}
                              </button>
                              <span className="admin-product-meta">
                                {product.brand && <span>{product.brand}</span>}
                                {product.category && <span>{product.category}</span>}
                                <span>{formatDate(product.publishedAt)}</span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="admin-col-price">
                          {product.price != null ? (
                            <span className="admin-price-stack">
                              <strong>{formatPrice(product.price, product.currency)}</strong>
                              {product.originalPrice != null && product.originalPrice > product.price && (
                                <span className="admin-price-mrp">{formatPrice(product.originalPrice, product.currency)}</span>
                              )}
                            </span>
                          ) : (
                            <span className="admin-muted">—</span>
                          )}
                        </td>
                        <td className="admin-col-store">
                          <span className="admin-pill">{product.source.platformLabel}</span>
                        </td>
                        <td className="admin-col-links">
                          <div className="admin-links">
                            {original ? (
                              <a href={original} target="_blank" rel="noreferrer noopener" title={original}>
                                <Icon name="link" size={12} /> {displayUrl(original, 26)}
                              </a>
                            ) : (
                              <span className="admin-muted">No source URL</span>
                            )}
                            {affiliate ? (
                              <a href={affiliate} target="_blank" rel="noreferrer noopener" title={affiliate} className="admin-link-affiliate">
                                <Icon name="tag" size={12} /> Affiliate link
                              </a>
                            ) : (
                              <span className="admin-muted admin-muted-sm">No affiliate URL</span>
                            )}
                          </div>
                        </td>
                        <td className="admin-col-status">
                          <span className={`admin-pill admin-pill-${product.visible === false ? 'muted' : 'success'}`}>
                            {product.visible === false ? 'Hidden' : 'Live'}
                          </span>
                        </td>
                        <td className="admin-col-actions">
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="admin-icon-btn"
                              onClick={() => setEditing(product)}
                              aria-label="Edit product"
                              title="Edit product"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-btn"
                              onClick={() => toggleVisibility(product)}
                              disabled={busyId === product.id}
                              aria-label={product.visible === false ? 'Show product' : 'Hide product'}
                              title={product.visible === false ? 'Show on storefront' : 'Hide from storefront'}
                            >
                              <Icon name={product.visible === false ? 'eye' : 'cloudOff'} size={15} />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn-danger"
                              onClick={() => setConfirm({ ids: [product.id], label: product.title || 'Untitled product' })}
                              aria-label="Delete product"
                              title="Delete product"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="admin-cards">
                {filtered.map((product) => (
                  <div className="admin-mcard" key={product.id}>
                    <label className="admin-mcard-check">
                      <input
                        type="checkbox"
                        checked={selection.has(product.id)}
                        onChange={() => toggle(product.id)}
                        aria-label={`Select ${product.title || 'product'}`}
                      />
                    </label>
                    <span className="admin-thumb admin-mcard-thumb">
                      <StoreImage src={product.images[0] ? product.images[0].url : ''} alt="" />
                    </span>
                    <div className="admin-mcard-body">
                      <button type="button" className="admin-product-title" onClick={() => setEditing(product)}>
                        {product.title || 'Untitled product'}
                      </button>
                      <div className="admin-mcard-meta">
                        {product.price != null && <strong>{formatPrice(product.price, product.currency)}</strong>}
                        <span className="admin-pill">{product.source.platformLabel}</span>
                        <span className={`admin-pill admin-pill-${product.visible === false ? 'muted' : 'success'}`}>
                          {product.visible === false ? 'Hidden' : 'Live'}
                        </span>
                      </div>
                      <div className="admin-mcard-actions">
                        <button type="button" className="admin-ghost-btn" onClick={() => setEditing(product)}>
                          <Icon name="edit" size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="admin-ghost-btn"
                          onClick={() => toggleVisibility(product)}
                          disabled={busyId === product.id}
                        >
                          <Icon name={product.visible === false ? 'eye' : 'cloudOff'} size={14} />
                          {product.visible === false ? 'Show' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          className="admin-danger-btn"
                          onClick={() => setConfirm({ ids: [product.id], label: product.title || 'Untitled product' })}
                        >
                          <Icon name="trash" size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AdminProductDrawer product={editing} onClose={() => setEditing(null)} onSave={saveEdit} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete from catalog"
        message={
          confirm && confirm.ids.length === 1
            ? `Delete "${confirm.label}" from the storefront catalog? This cannot be undone.`
            : `Delete ${confirm ? confirm.label : ''} from the storefront catalog? This cannot be undone.`
        }
        confirmLabel="Delete"
        loading={bulkBusy}
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
