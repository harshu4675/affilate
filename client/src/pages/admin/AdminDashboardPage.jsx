import { Link } from 'react-router-dom';
import { useAdminCatalog } from '../../hooks/useAdminCatalog.js';
import { Icon } from '../../components/icons/Icons.jsx';
import { StoreImage } from '../../components/store/StoreImage.jsx';
import { formatPrice, timeAgo } from '../../utils/format.js';

function StatCard({ label, value, hint, tone = 'default', icon }) {
  return (
    <div className={`admin-stat admin-stat-${tone}`}>
      <span className="admin-stat-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
      {hint && <span className="admin-stat-hint">{hint}</span>}
    </div>
  );
}

export function AdminDashboardPage() {
  const { products, stats, status, error, reload } = useAdminCatalog();

  if (status === 'loading') {
    return (
      <div className="admin-page">
        <div className="admin-stats">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="admin-stat skeleton-block" key={i} />
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
          <h2>Could not load the catalog</h2>
          <p>{error}</p>
          <button type="button" className="admin-primary-btn" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recent = [...products]
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 6);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Overview of the live Talishh catalog.</p>
        </div>
        <button type="button" className="admin-ghost-btn" onClick={reload}>
          <Icon name="refresh" size={15} />
          Refresh
        </button>
      </div>

      {products.length === 0 ? (
        <div className="admin-state">
          <Icon name="box" size={22} />
          <h2>No products published yet</h2>
          <p>Import products with the extractor, then publish them to the storefront.</p>
          <Link to="/admin/import" className="admin-primary-btn">
            Import &amp; publish
          </Link>
        </div>
      ) : (
        <>
          <div className="admin-stats">
            <StatCard icon="box" label="Total products" value={stats.total} />
            <StatCard icon="eye" label="Visible on storefront" value={stats.visible} tone="success" />
            <StatCard icon="cloudOff" label="Hidden" value={stats.hidden} tone={stats.hidden > 0 ? 'warning' : 'default'} />
            <StatCard icon="store" label="Stores" value={stats.stores} />
            <StatCard
              icon="link"
              label="Missing store link"
              value={stats.missingLink}
              tone={stats.missingLink > 0 ? 'danger' : 'default'}
              hint={stats.missingLink > 0 ? 'These cannot be purchased' : 'All products are buyable'}
            />
            <StatCard icon="tag" label="Missing price" value={stats.missingPrice} tone={stats.missingPrice > 0 ? 'warning' : 'default'} />
            <StatCard icon="image" label="Missing image" value={stats.missingImage} tone={stats.missingImage > 0 ? 'warning' : 'default'} />
            <StatCard
              icon="zap"
              label="Average price"
              value={stats.averagePrice != null ? formatPrice(stats.averagePrice, products.find((p) => p.currency)?.currency) : '—'}
            />
          </div>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>Recently published</h2>
              <Link to="/admin/products" className="admin-ghost-btn">
                Manage products
              </Link>
            </div>
            <ul className="admin-recent">
              {recent.map((product) => (
                <li key={product.id} className="admin-recent-item">
                  <span className="admin-recent-thumb">
                    <StoreImage src={product.images[0] ? product.images[0].url : ''} alt="" />
                  </span>
                  <span className="admin-recent-main">
                    <span className="admin-recent-title">{product.title || 'Untitled product'}</span>
                    <span className="admin-recent-meta">
                      {product.source.platformLabel}
                      {product.price != null ? ` · ${formatPrice(product.price, product.currency)}` : ''}
                    </span>
                  </span>
                  <span className={`admin-pill admin-pill-${product.visible === false ? 'muted' : 'success'}`}>
                    {product.visible === false ? 'Hidden' : 'Live'}
                  </span>
                  <span className="admin-recent-time">{timeAgo(product.publishedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
