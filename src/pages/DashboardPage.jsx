import { useNavigate, Link } from 'react-router-dom';
import { UrlExtractor } from '../components/extractor/UrlExtractor.jsx';
import { Icon } from '../components/icons/Icons.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useToast } from '../components/ui/ToastProvider.jsx';
import { useApp } from '../state/AppProvider.jsx';
import { createProductFromExtraction, createEmptyProduct } from '../state/productFactory.js';
import { getPlatform } from '../constants/platforms.js';
import { STATUSES, STATUS_LABELS } from '../constants/app.js';
import { timeAgo, formatDate } from '../utils/format.js';
import { displayUrl } from '../utils/url.js';

const HISTORY_STATUS = {
  success: { label: 'Extracted', tone: 'success' },
  partial: { label: 'Partial', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' }
};

export function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { products, history, setDraft, addHistory } = useApp();

  const stats = STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: products.filter((product) => product.status === status).length
  }));
  const total = products.length;

  const handleExtracted = (data) => {
    const product = createProductFromExtraction(data);
    setDraft(product);
    addHistory({
      url: data.source.url,
      platform: data.source.platform,
      status: data.partial ? 'partial' : 'success',
      productId: product.id,
      title: product.title || data.source.url,
      extractedAt: new Date().toISOString()
    });
    if (data.partial) {
      toast.warning('Product extracted with partial data. Review the missing fields before saving.');
    } else {
      toast.success('Product extracted. Review and save it.');
    }
    navigate('/products/new');
  };

  const handleError = (url) => {
    addHistory({
      url,
      platform: '',
      status: 'failed',
      productId: null,
      title: url,
      extractedAt: new Date().toISOString()
    });
  };

  const handleManual = () => {
    setDraft(createEmptyProduct());
    navigate('/products/new');
  };

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="hero-title">Import a product from any store</h1>
          <p className="hero-subtitle">
            Paste a product link. Affilate extracts the real product data, lets you review and edit every field,
            then saves it to your library.
          </p>
        </div>
        <UrlExtractor onResult={handleExtracted} onError={handleError} onManual={handleManual} autoFocus />
      </section>

      <section className="stats-section">
        <Link to="/library" className="stat-card">
          <span className="stat-value">{total}</span>
          <span className="stat-label">Total products</span>
        </Link>
        {stats.map((stat) => (
          <Link to={`/library?status=${stat.status}`} className="stat-card" key={stat.status}>
            <span className="stat-value">{stat.count}</span>
            <span className="stat-label">{stat.label}</span>
          </Link>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2 className="section-title">Recent imports</h2>
            <p className="section-subtitle">Your latest extraction activity</p>
          </div>
          <Link to="/library" className="btn btn-secondary btn-sm">
            Open library
          </Link>
        </div>
        {history.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="history"
              title="No imports yet"
              message="Paste a product link above and run your first extraction."
            />
          </div>
        ) : (
          <div className="card history-card">
            <ul className="history-list">
              {history.slice(0, 6).map((entry) => {
                const meta = HISTORY_STATUS[entry.status] || HISTORY_STATUS.failed;
                const platform = getPlatform(entry.platform);
                return (
                  <li className="history-item" key={entry.id}>
                    <span className="history-platform">
                      {entry.platform ? (
                        <span className="platform-dot" style={{ backgroundColor: platform.color }} />
                      ) : (
                        <Icon name="link" size={13} />
                      )}
                    </span>
                    <div className="history-main">
                      <span className="history-title" title={entry.title}>
                        {entry.title}
                      </span>
                      <span className="history-url">{displayUrl(entry.url, 56)}</span>
                    </div>
                    <span className="history-time">{timeAgo(entry.extractedAt)}</span>
                    <span className={`history-status badge badge-${meta.tone}`}>{meta.label}</span>
                    {entry.productId && (
                      <Link
                        to={`/products/${entry.productId}`}
                        className="icon-btn icon-btn-sm"
                        aria-label="Open product"
                        title="Open product"
                      >
                        <Icon name="arrowLeft" size={15} className="rotate-180" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="history-footer">
              <span>
                Last extraction at {formatDate(history[0] ? history[0].extractedAt : '')}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
