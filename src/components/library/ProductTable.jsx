import { Icon } from '../icons/Icons.jsx';
import { IconButton } from '../ui/Button.jsx';
import { Dropdown, MenuItem } from '../ui/Dropdown.jsx';
import { StatusBadge, PlatformBadge } from '../ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';

export function ProductTable({ products, selection, onToggle, onSelectAll, onView, onEdit, onDuplicate, onCopyLink, onOpenSource, onDelete, allSelected }) {
  return (
    <div className="table-scroll">
      <table className="product-table">
        <thead>
          <tr>
            <th className="col-check">
              <input
                type="checkbox"
                aria-label="Select all products"
                checked={allSelected}
                onChange={onSelectAll}
              />
            </th>
            <th className="col-product">Product</th>
            <th className="col-price">Price</th>
            <th className="col-category">Category</th>
            <th className="col-status">Status</th>
            <th className="col-updated">Updated</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={selection.has(product.id) ? 'row-selected' : ''}>
              <td className="col-check">
                <input
                  type="checkbox"
                  aria-label={`Select ${product.title || 'product'}`}
                  checked={selection.has(product.id)}
                  onChange={() => onToggle(product.id)}
                />
              </td>
              <td className="col-product">
                <div className="table-product">
                  <div className="table-thumb">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0].url} alt="" loading="lazy" />
                    ) : (
                      <Icon name="image" size={15} />
                    )}
                  </div>
                  <div className="table-product-main">
                    <button type="button" className="table-title" onClick={() => onView(product)} title={product.title}>
                      {product.title || 'Untitled product'}
                    </button>
                    <div className="table-product-meta">
                      {product.source && product.source.platform ? (
                        <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
                      ) : (
                        <span className="source-none">Manual</span>
                      )}
                      {product.brand && <span className="table-brand">{product.brand}</span>}
                    </div>
                  </div>
                </div>
              </td>
              <td className="col-price">
                {product.price != null ? (
                  <span className="table-price">{formatCurrency(product.price, product.currency)}</span>
                ) : (
                  <span className="table-muted">—</span>
                )}
              </td>
              <td className="col-category">
                <span className="table-category">{product.category || <span className="table-muted">—</span>}</span>
              </td>
              <td className="col-status">
                <StatusBadge status={product.status} />
              </td>
              <td className="col-updated table-updated">{formatDate(product.updatedAt)}</td>
              <td className="col-actions">
                <div className="table-actions">
                  <IconButton name="eye" label="View product" size="sm" onClick={() => onView(product)} />
                  <IconButton name="edit" label="Edit product" size="sm" onClick={() => onEdit(product)} />
                  <Dropdown
                    trigger={
                      <IconButton name="dotsVertical" label="More actions" size="sm" />
                    }
                  >
                    <MenuItem icon="duplicate" label="Duplicate" onClick={() => onDuplicate(product)} />
                    <MenuItem icon="copy" label="Copy source link" onClick={() => onCopyLink(product)} />
                    <MenuItem
                      icon="external"
                      label="Open source"
                      onClick={() => onOpenSource(product)}
                      disabled={!product.source || !product.source.url}
                    />
                    <MenuItem icon="trash" label="Delete" danger onClick={() => onDelete(product)} />
                  </Dropdown>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductCardGrid({ products, selection, onToggle, onView, onEdit, onDuplicate, onCopyLink, onOpenSource, onDelete }) {
  return (
    <div className="product-cards">
      {products.map((product) => (
        <div className={`product-card card${selection.has(product.id) ? ' product-card-selected' : ''}`} key={product.id}>
          <div className="product-card-media" onClick={() => onView(product)}>
            {product.images && product.images[0] ? (
              <img src={product.images[0].url} alt="" loading="lazy" />
            ) : (
              <div className="product-card-media-empty">
                <Icon name="image" size={22} />
              </div>
            )}
            <span className="product-card-check">
              <input
                type="checkbox"
                aria-label={`Select ${product.title || 'product'}`}
                checked={selection.has(product.id)}
                onChange={(event) => {
                  event.stopPropagation();
                  onToggle(product.id);
                }}
              />
            </span>
          </div>
          <div className="product-card-body">
            <button type="button" className="product-card-title" onClick={() => onView(product)}>
              {product.title || 'Untitled product'}
            </button>
            <div className="product-card-meta">
              {product.source && product.source.platform ? (
                <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
              ) : (
                <span className="source-none">Manual</span>
              )}
              <StatusBadge status={product.status} />
            </div>
            <div className="product-card-price">
              {product.price != null ? (
                formatCurrency(product.price, product.currency)
              ) : (
                <span className="table-muted">No price</span>
              )}
            </div>
            <div className="product-card-footer">
              <span className="product-card-category">{product.category || 'Uncategorized'}</span>
              <span className="product-card-updated">{formatDate(product.updatedAt)}</span>
            </div>
            <div className="product-card-actions">
              <IconButton name="edit" label="Edit product" size="sm" onClick={() => onEdit(product)} />
              <Dropdown
                trigger={<IconButton name="dotsVertical" label="More actions" size="sm" />}
              >
                <MenuItem icon="duplicate" label="Duplicate" onClick={() => onDuplicate(product)} />
                <MenuItem icon="copy" label="Copy source link" onClick={() => onCopyLink(product)} />
                <MenuItem
                  icon="external"
                  label="Open source"
                  onClick={() => onOpenSource(product)}
                  disabled={!product.source || !product.source.url}
                />
                <MenuItem icon="trash" label="Delete" danger onClick={() => onDelete(product)} />
              </Dropdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


