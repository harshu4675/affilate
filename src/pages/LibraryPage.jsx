import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppProvider.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { Icon } from '../components/icons/Icons.jsx';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Dropdown, MenuItem } from '../components/ui/Dropdown.jsx';
import { ProductTable, ProductCardGrid } from '../components/library/ProductTable.jsx';
import { ViewProductModal } from '../components/library/ViewProductModal.jsx';
import { duplicateProduct } from '../state/productFactory.js';
import { exportProductsCsv, exportProductsJson, copyText } from '../services/exportService.js';
import { PLATFORMS } from '../constants/platforms.js';
import { STATUSES, STATUS_LABELS, SORT_OPTIONS } from '../constants/app.js';
import { safeExternalHref } from '../utils/url.js';

const DATE_PRESETS = [
  { id: 'any', label: 'Any date' },
  { id: '7', label: 'Added in last 7 days' },
  { id: '30', label: 'Added in last 30 days' },
  { id: '365', label: 'Added in last year' }
];

const PRICE_PRESETS = [
  { id: 'any', label: 'Any price' },
  { id: '0-25', label: 'Under 25' },
  { id: '25-50', label: '25 - 50' },
  { id: '50-100', label: '50 - 100' },
  { id: '100-250', label: '100 - 250' },
  { id: '250-500', label: '250 - 500' },
  { id: '500', label: 'Over 500' }
];

export function LibraryPage() {
  const { products, upsertProduct, upsertProducts, deleteProducts } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [platform, setPlatform] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priceRange, setPriceRange] = useState('any');
  const [dateRange, setDateRange] = useState('any');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('');
  const [selection, setSelection] = useState(() => new Set());
  const [viewProduct, setViewProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState('');
  const searchRef = useRef(null);

  const categories = useMemo(() => {
    const set = new Set();
    for (const item of products) if (item.category) set.add(item.category);
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    const needle = debouncedQuery.trim().toLowerCase();
    if (needle) {
      list = list.filter((item) => {
        const haystack = [
          item.title,
          item.brand,
          item.category,
          item.subcategory,
          item.sku,
          item.productId,
          item.seller,
          item.source && item.source.platformLabel,
          item.source && item.source.url
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }
    if (platform) list = list.filter((item) => item.source && item.source.platform === platform);
    if (category) list = list.filter((item) => item.category === category);
    if (status) list = list.filter((item) => item.status === status);
    if (priceRange !== 'any') {
      const parts = priceRange.split('-');
      const min = parts[0] ? Number(parts[0]) : null;
      const max = parts.length > 1 ? Number(parts[1]) : null;
      list = list.filter((item) => {
        if (item.price == null) return false;
        if (min != null && item.price < min) return false;
        if (max != null && item.price > max) return false;
        return true;
      });
    }
    if (dateRange !== 'any') {
      const cutoff = Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;
      list = list.filter((item) => new Date(item.createdAt || 0).getTime() >= cutoff);
    }
    const sorters = {
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      oldest: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      updated: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
      alpha: (a, b) => (a.title || '').localeCompare(b.title || ''),
      alpha_desc: (a, b) => (b.title || '').localeCompare(a.title || ''),
      price_asc: (a, b) => (a.price == null ? Infinity : a.price) - (b.price == null ? Infinity : b.price),
      price_desc: (a, b) => (b.price == null ? -Infinity : b.price) - (a.price == null ? -Infinity : a.price)
    };
    list.sort(sorters[sort] || sorters.newest);
    return list;
  }, [products, debouncedQuery, platform, category, status, priceRange, dateRange, sort]);

  const hasFilters = Boolean(query || platform || category || status || priceRange !== 'any' || dateRange !== 'any');

  const clearFilters = () => {
    setQuery('');
    setPlatform('');
    setCategory('');
    setStatus('');
    setPriceRange('any');
    setDateRange('any');
  };

  const toggleSelect = (id) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelection((prev) => {
      const all = new Set(filtered.map((item) => item.id));
      if (prev.size === filtered.length && filtered.every((item) => prev.has(item.id))) return new Set();
      return all;
    });
  };

  const clearSelection = () => setSelection(new Set());

  const selectedProducts = useMemo(() => products.filter((item) => selection.has(item.id)), [products, selection]);

  const handleEdit = (product) => {
    navigate(`/products/${product.id}`);
  };

  const handleDuplicate = (product) => {
    const copy = duplicateProduct(product);
    const saved = upsertProduct(copy);
    if (!saved.ok) {
      toast.error(saved.message || 'Product could not be duplicated.');
      return;
    }
    toast.success('Product duplicated as a draft.');
  };

  const handleCopyLink = async (product) => {
    if (!product.source || !product.source.url) {
      toast.error('This product has no source link.');
      return;
    }
    await copyText(product.source.url);
    toast.success('Source link copied.');
  };

  const handleOpenSource = (product) => {
    const href = safeExternalHref(product.source && product.source.url);
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  const handleRefresh = (product) => {
    if (!product.source || !product.source.url) {
      toast.error('This product has no source URL to refresh.');
      return;
    }
    navigate(`/products/${product.id}?refresh=1`);
  };

  const handleDeleteOne = (product) => {
    setConfirmDelete({ ids: [product.id], label: product.title || 'Untitled product' });
  };

  const confirmBulkDelete = () => {
    const deleted = deleteProducts(confirmDelete.ids);
    if (!deleted.ok) {
      toast.error(deleted.message || 'The selected products could not be deleted.');
      return;
    }
    toast.success(confirmDelete.ids.length === 1 ? 'Product deleted.' : `${confirmDelete.ids.length} products deleted.`);
    setSelection(new Set());
    setConfirmDelete(null);
  };

  const applyBulkStatus = (nextStatus) => {
    const ids = [...selection];
    const now = new Date().toISOString();
    const result = upsertProducts(products.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, status: nextStatus, updatedAt: now })));
    if (!result.ok) {
      toast.error(result.message || 'The selected products could not be updated.');
      return;
    }
    toast.success(`Status changed to ${STATUS_LABELS[nextStatus]} for ${ids.length} product${ids.length === 1 ? '' : 's'}.`);
    setSelection(new Set());
  };

  const applyBulkCategory = () => {
    const value = bulkCategoryValue.trim();
    if (!value) {
      toast.error('Enter a category name.');
      return;
    }
    const ids = [...selection];
    const now = new Date().toISOString();
    const result = upsertProducts(products.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, category: value, updatedAt: now })));
    if (!result.ok) {
      toast.error(result.message || 'The selected products could not be updated.');
      return;
    }
    toast.success(`Category set for ${ids.length} product${ids.length === 1 ? '' : 's'}.`);
    setBulkCategoryOpen(false);
    setBulkCategoryValue('');
    setSelection(new Set());
  };

  const bulkExport = (format) => {
    const list = selectedProducts.length > 0 ? selectedProducts : filtered;
    if (list.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    if (format === 'csv') exportProductsCsv(list);
    else exportProductsJson(list);
    toast.success(`Exported ${list.length} product${list.length === 1 ? '' : 's'} as ${format.toUpperCase()}.`);
  };

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          match: (event) => event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey,
          action: () => {
            if (searchRef.current) searchRef.current.focus();
          }
        }
      ],
      []
    ),
    true
  );

  const allSelected = filtered.length > 0 && filtered.every((item) => selection.has(item.id));

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1 className="page-title">Product library</h1>
          <p className="page-subtitle">
            {products.length} product{products.length === 1 ? '' : 's'} in your library
          </p>
        </div>
        <Link to="/products/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} />
          Import product
        </Link>
      </div>

      <div className="library-toolbar card">
        <div className="toolbar-row">
          <div className="toolbar-search">
            <Icon name="search" size={15} />
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, brand, platform, category..."
              aria-label="Search products"
            />
            {query && (
              <button type="button" className="toolbar-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
          <div className="toolbar-filters">
            <Select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Filter by platform">
              <option value="">All platforms</option>
              {PLATFORMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
            <Select value={priceRange} onChange={(event) => setPriceRange(event.target.value)} aria-label="Filter by price">
              {PRICE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter by date added">
              {DATE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
              {SORT_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="toolbar-view">
            <IconButton
              name="list"
              label="Table view"
              className={viewMode !== 'cards' ? 'toolbar-view-active' : ''}
              onClick={() => setViewMode('')}
            />
            <IconButton
              name="grid"
              label="Grid view"
              className={viewMode === 'cards' ? 'toolbar-view-active' : ''}
              onClick={() => setViewMode('cards')}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {selection.size > 0 && (
        <div className="bulk-bar card">
          <span className="bulk-count">
            {selection.size} selected
            <button type="button" className="bulk-clear" onClick={clearSelection}>
              Clear
            </button>
          </span>
          <div className="bulk-actions">
            <Select
              className="bulk-status-select"
              value=""
              onChange={(event) => event.target.value && applyBulkStatus(event.target.value)}
              aria-label="Change status for selected"
            >
              <option value="">Set status...</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" icon="folder" onClick={() => setBulkCategoryOpen(true)}>
              Set category
            </Button>
            <Dropdown
              trigger={
                <Button variant="secondary" size="sm" icon="download">
                  Export
                </Button>
              }
            >
              <MenuItem icon="download" label="Export as CSV" onClick={() => bulkExport('csv')} />
              <MenuItem icon="download" label="Export as JSON" onClick={() => bulkExport('json')} />
            </Dropdown>
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              onClick={() => setConfirmDelete({ ids: [...selection], label: `${selection.size} selected products` })}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card library-empty">
          {products.length === 0 ? (
            <EmptyState
              icon="box"
              title="No products yet"
              message="Import your first product by pasting a store link on the dashboard."
              action={
                <Link to="/" className="btn btn-primary">
                  Import a product
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title="No matching products"
              message="Try adjusting your search or filters."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className={`library-view library-view-${viewMode}`}>
          <ProductTable
            products={filtered}
            selection={selection}
            onToggle={toggleSelect}
            onSelectAll={selectAll}
            allSelected={allSelected}
            onView={setViewProduct}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onCopyLink={handleCopyLink}
            onOpenSource={handleOpenSource}
            onRefresh={handleRefresh}
            onDelete={handleDeleteOne}
          />
          <ProductCardGrid
            products={filtered}
            selection={selection}
            onToggle={toggleSelect}
            onView={setViewProduct}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onCopyLink={handleCopyLink}
            onOpenSource={handleOpenSource}
            onRefresh={handleRefresh}
            onDelete={handleDeleteOne}
          />
        </div>
      )}

      <ViewProductModal
        product={viewProduct}
        onClose={() => setViewProduct(null)}
        onCopyLink={handleCopyLink}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete products"
        message={
          confirmDelete && confirmDelete.ids.length === 1
            ? `Delete "${confirmDelete.label}" from your library? This cannot be undone.`
            : `Delete ${confirmDelete ? confirmDelete.label : ''} from your library? This cannot be undone.`
        }
        confirmLabel="Delete"
        onConfirm={confirmBulkDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <Modal
        open={bulkCategoryOpen}
        onClose={() => setBulkCategoryOpen(false)}
        title="Set category"
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkCategoryOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={applyBulkCategory} >
              Apply to {selection.size}
            </Button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="bulk-category">
            Category
          </label>
          <Input
            id="bulk-category"
            list="bulk-category-options"
            value={bulkCategoryValue}
            onChange={(event) => setBulkCategoryValue(event.target.value)}
            placeholder="e.g. Electronics"
            autoFocus
          />
          <datalist id="bulk-category-options">
            {categories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      </Modal>
    </div>
  );
}
