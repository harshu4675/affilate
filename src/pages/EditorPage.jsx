import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppProvider.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { useAutosave } from '../hooks/useAutosave.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Input.jsx';
import { ConfirmDialog, Modal } from '../components/ui/Modal.jsx';
import { PlatformBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Icon } from '../components/icons/Icons.jsx';
import { BasicInfoSection } from '../components/product/BasicInfoSection.jsx';
import { PricingSection } from '../components/product/PricingSection.jsx';
import { ImagesSection } from '../components/product/ImagesSection.jsx';
import { VariantsSection } from '../components/product/VariantsSection.jsx';
import { SpecsSection } from '../components/product/SpecsSection.jsx';
import { SourceSection } from '../components/product/SourceSection.jsx';
import { ProductPreview } from '../components/product/ProductPreview.jsx';
import { ImageLightbox } from '../components/product/ImageLightbox.jsx';
import { RefreshDialog } from '../components/product/RefreshDialog.jsx';
import { DuplicateDialog } from '../components/product/DuplicateDialog.jsx';
import { validateProduct } from '../validation/productValidation.js';
import { createEmptyProduct, duplicateProduct } from '../state/productFactory.js';
import { extractProduct } from '../services/api.js';
import { mergeRefreshed, REFRESH_GROUPS } from '../utils/productMerge.js';
import { STATUSES, STATUS_LABELS } from '../constants/app.js';

export function EditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { products, draft, setDraft, clearDraft, upsertProduct, deleteProducts, findByUrl } = useApp();

  const [product, setProduct] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [showErrors, setShowErrors] = useState(false);
  const [validation, setValidation] = useState({ errors: {}, warnings: {} });
  const [refreshing, setRefreshing] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [refreshSelection, setRefreshSelection] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const [showDraftNotice, setShowDraftNotice] = useState(false);
  const dirtyRef = useRef(false);
  const discardedRef = useRef(false);

  useEffect(() => {
    if (isNew) {
      if (draft) {
        setShowDraftNotice(true);
        setProduct(draft);
      } else {
        setProduct(createEmptyProduct());
      }
      setLoadState('ready');
    } else {
      const found = products.find((item) => item.id === id);
      if (found) {
        setProduct(found);
        setLoadState('ready');
      } else {
        setLoadState('missing');
      }
    }
  }, [id, isNew]);

  const updateProduct = useCallback((patch, fieldPaths) => {
    setProduct((prev) => {
      if (!prev) return prev;
      const edited = new Set(prev.editedFields || []);
      for (const path of fieldPaths || []) edited.add(path);
      return { ...prev, ...patch, editedFields: [...edited], updatedAt: new Date().toISOString() };
    });
    dirtyRef.current = true;
  }, []);

  const handleChange = useCallback(
    (field, value, extra) => {
      updateProduct({ [field]: value, ...(extra || {}) }, [field, ...Object.keys(extra || {})]);
    },
    [updateProduct]
  );

  const categories = useMemo(() => {
    const set = new Set();
    for (const item of products) if (item.category) set.add(item.category);
    return [...set].sort();
  }, [products]);

  useAutosave(product, 900, (value) => {
    if (isNew && value && !discardedRef.current) setDraft(value);
  });

  useEffect(() => {
    const handler = (event) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => {
      if (!dirtyRef.current) return false;
      return currentLocation.pathname !== nextLocation.pathname;
    }, [])
  );

  const discardDraft = () => {
    discardedRef.current = true;
    clearDraft();
    setShowDraftNotice(false);
    setProduct(createEmptyProduct());
    dirtyRef.current = false;
    toast.info('Draft discarded.');
  };

  const discardAndLeave = () => {
    if (isNew) {
      discardedRef.current = true;
      clearDraft();
    }
    dirtyRef.current = false;
    blocker.proceed();
  };

  const persist = (target, override) => {
    const now = new Date().toISOString();
    const record = {
      ...target,
      ...(override || {}),
      removedImages: [],
      editedFields: Array.from(new Set(target.editedFields || [])),
      updatedAt: now,
      createdAt: target.createdAt || now
    };
    const isUpdate = Boolean(products.find((item) => item.id === record.id));
    upsertProduct(record);
    discardedRef.current = true;
    clearDraft();
    dirtyRef.current = false;
    toast.success(isUpdate ? 'Product updated.' : 'Product saved to library.');
    navigate('/library');
  };

  const handleSave = () => {
    if (!product) return;
    const result = validateProduct(product);
    setValidation(result);
    setShowErrors(true);
    if (!result.valid) {
      toast.error('Please fix the highlighted fields before saving.');
      const first = Object.keys(result.errors)[0];
      if (first) {
        const el = document.getElementById(`field-${first}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const existing = findByUrl(product.source && product.source.url);
    if (existing && existing.id !== product.id) {
      setDuplicateInfo({ existing });
      return;
    }
    persist(product);
  };

  const handleRefreshClick = () => {
    if (!product || !product.source || !product.source.url) {
      toast.error('This product has no source URL to refresh from.');
      return;
    }
    if ((product.editedFields || []).length > 0) {
      setRefreshSelection(REFRESH_GROUPS.map((group) => group.id));
      setRefreshOpen(true);
      return;
    }
    runRefresh(REFRESH_GROUPS.map((group) => group.id));
  };

  const runRefresh = async (groups) => {
    if (!product || !product.source || !product.source.url) return;
    setRefreshing(true);
    try {
      const data = await extractProduct(product.source.url);
      const fresh = data.product;
      const platform = data.source.platform;
      setProduct((prev) => {
        if (!prev) return prev;
        const merged = mergeRefreshed(prev, fresh, groups, platform);
        return {
          ...merged,
          source: {
            ...merged.source,
            platform: data.source.platform || merged.source.platform,
            platformLabel: data.source.platformLabel || merged.source.platformLabel,
            domain: data.source.domain || merged.source.domain,
            finalUrl: data.source.finalUrl || merged.source.finalUrl
          }
        };
      });
      setRefreshOpen(false);
      setRefreshSelection([]);
      toast.success('Product data refreshed from the source.');
    } catch (err) {
      toast.error(err && err.message ? err.message : 'Could not refresh product data.');
      setRefreshOpen(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = () => {
    if (!product) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    deleteProducts([product.id]);
    discardedRef.current = true;
    clearDraft();
    toast.success('Product deleted.');
    navigate('/library');
  };

  const handleDuplicate = () => {
    if (!product) return;
    const copy = duplicateProduct(product);
    upsertProduct(copy);
    toast.success('Product duplicated as a draft.');
    navigate(`/products/${copy.id}`);
  };

  const editedCount = product && product.editedFields ? product.editedFields.length : 0;

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          match: (event) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's',
          action: () => handleSave(),
          allowInInput: true
        },
        {
          match: (event) => (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd',
          action: () => handleDuplicate(),
          allowInInput: true
        }
      ],
      [product]
    ),
    loadState === 'ready'
  );

  if (loadState === 'missing') {
    return (
      <div className="page-empty">
        <EmptyState
          icon="box"
          title="Product not found"
          message="This product may have been deleted or the link is outdated."
          action={
            <Link to="/library" className="btn btn-primary">
              Back to library
            </Link>
          }
        />
      </div>
    );
  }

  if (loadState === 'loading' || !product) {
    return (
      <div className="page-loading">
        <Spinner size={22} />
      </div>
    );
  }

  const missingLabels = {
    title: 'title',
    description: 'description',
    price: 'price',
    images: 'images',
    brand: 'brand',
    category: 'category',
    availability: 'availability'
  };

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <Link to="/library" className="btn btn-ghost btn-sm">
          <Icon name="arrowLeft" size={15} />
          Library
        </Link>
        <div className="editor-topbar-actions">
          {product.source && product.source.url && (
            <Button variant="ghost" size="sm" icon="refresh" onClick={handleRefreshClick} loading={refreshing}>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
          )}
          <Button variant="ghost" size="sm" icon="duplicate" onClick={handleDuplicate}>
            Duplicate
          </Button>
          <Button variant="ghost" size="sm" icon="trash" onClick={handleDelete} className="btn-danger-text">
            Delete
          </Button>
          <Button variant="primary" size="sm" icon="check" onClick={handleSave}>
            Save product
          </Button>
        </div>
      </div>

      <div className="editor-heading">
        <div className="editor-heading-main">
          <h1 className="editor-heading-title">{product.title || (isNew ? 'New product' : 'Untitled product')}</h1>
          <div className="editor-heading-meta">
            {product.source && product.source.platform ? (
              <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
            ) : (
              <span className="source-none">Not imported</span>
            )}
            {product.source && product.source.domain && <span className="editor-domain">{product.source.domain}</span>}
            {!isNew && <StatusBadge status={product.status} />}
            {editedCount > 0 && (
              <span className="edited-fields-chip" title="Fields you changed manually">
                <Icon name="edit" size={12} />
                {editedCount} edited
              </span>
            )}
          </div>
        </div>
        <label className="status-select-wrap">
          <span className="status-select-label">Status</span>
          <Select value={product.status} onChange={(event) => handleChange('status', event.target.value)} className="status-select">
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {showDraftNotice && isNew && (
        <div className="banner banner-info">
          <Icon name="history" size={16} />
          <div className="banner-text">
            <strong>Unsaved draft restored.</strong> We kept the product you were working on.
          </div>
          <Button variant="ghost" size="sm" onClick={discardDraft}>
            Discard draft
          </Button>
        </div>
      )}

      {isNew && product.source && product.source.partial && (
        <div className="banner banner-warning">
          <Icon name="alertTriangle" size={16} />
          <div className="banner-text">
            <strong>Partial extraction.</strong> Some fields could not be read from the source:{' '}
            {(product.source.missingFields || []).map((field) => missingLabels[field] || field).join(', ') || 'various fields'}.
            Fill them in below or refresh the data.
          </div>
        </div>
      )}

      {Object.keys(validation.warnings).length > 0 && (
        <div className="banner banner-neutral">
          <Icon name="info" size={16} />
          <div className="banner-text">
            <strong>Review before publishing:</strong>{' '}
            {Object.values(validation.warnings).join(' ')}
          </div>
        </div>
      )}

      <div className="editor-layout">
        <div className="editor-form">
          <BasicInfoSection
            product={product}
            categories={categories}
            onChange={handleChange}
            errors={validation.errors}
            showErrors={showErrors}
          />
          <PricingSection
            product={product}
            onChange={handleChange}
            errors={validation.errors}
            showErrors={showErrors}
          />
          <ImagesSection product={product} onChange={handleChange} onPreview={setLightbox} />
          <VariantsSection product={product} onChange={handleChange} />
          <SpecsSection product={product} onChange={handleChange} />
          <SourceSection product={product} onChange={handleChange} onRefresh={handleRefreshClick} refreshing={refreshing} />
        </div>
        <aside className="editor-preview-col">
          <ProductPreview product={product} />
          <p className="preview-note">Live preview. It always reflects your edited data.</p>
        </aside>
      </div>

      {lightbox && (
        <ImageLightbox image={lightbox} images={product.images || []} onClose={() => setLightbox(null)} />
      )}

      <RefreshDialog
        open={refreshOpen}
        editedCount={editedCount}
        selection={refreshSelection}
        onSelectionChange={setRefreshSelection}
        onRefreshAll={() => runRefresh(REFRESH_GROUPS.map((group) => group.id))}
        onRefreshSelected={() => runRefresh(refreshSelection)}
        onCancel={() => setRefreshOpen(false)}
        loading={refreshing}
      />

      <DuplicateDialog
        open={Boolean(duplicateInfo)}
        existing={duplicateInfo && duplicateInfo.existing}
        onCancel={() => setDuplicateInfo(null)}
        onOpenExisting={() => {
          navigate(`/products/${duplicateInfo.existing.id}`);
          setDuplicateInfo(null);
        }}
        onUpdateExisting={() => {
          persist(product, { id: duplicateInfo.existing.id, createdAt: duplicateInfo.existing.createdAt });
          setDuplicateInfo(null);
        }}
        onSaveSeparate={() => {
          persist(duplicateProduct(product));
          setDuplicateInfo(null);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete product"
        message={`Delete "${product.title || 'Untitled product'}" from your library? This cannot be undone.`}
        confirmLabel="Delete product"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {blocker.state === 'blocked' && (
        <Modal open onClose={() => blocker.reset()} title="Unsaved changes" width="sm">
          <p className="confirm-message">
            You have unsaved changes. If you leave this page, your edits will be lost.
          </p>
          <div className="modal-footer-inline">
            <Button variant="secondary" onClick={() => blocker.reset()}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={discardAndLeave}>
              Discard changes
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
