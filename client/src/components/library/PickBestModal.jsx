import { useMemo } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button, IconButton } from '../ui/Button.jsx';
import { Icon } from '../icons/Icons.jsx';
import { SafeImage } from '../ui/SafeImage.jsx';
import { PlatformBadge } from '../ui/Badge.jsx';
import { useToast } from '../ui/ToastProvider.jsx';
import { rankProducts } from '../../utils/productScoring.js';
import { formatCurrency } from '../../utils/format.js';

function primaryImage(product) {
  const images = product.images || [];
  return images.find((image) => image.isPrimary) || images[0] || null;
}

function ReasonChips({ entry }) {
  const positives = entry.reasons.filter((reason) => reason.points > 0).slice(0, 4);
  const warnings = entry.reasons.filter((reason) => reason.points === 0 && /no price|no store link|no images|out of stock/i.test(reason.label)).slice(0, 2);
  return (
    <div className="pickbest-chips">
      {positives.map((reason) => (
        <span key={reason.label} className="pickbest-chip pickbest-chip-good">
          <Icon name="check" size={11} />
          {reason.label}
        </span>
      ))}
      {warnings.map((reason) => (
        <span key={reason.label} className="pickbest-chip pickbest-chip-warn">
          <Icon name="alertCircle" size={11} />
          {reason.label}
        </span>
      ))}
    </div>
  );
}

/**
 * "Pick Best Products" — rank the imported library for promotion using only
 * data that exists on each product (price, discount, availability, images,
 * links, metadata). The user can shortlist winners; the shortlist persists
 * in the library and filters the table.
 */
export function PickBestModal({ open, onClose, products, shortlist, onToggleShortlist, onShortlistTop, onEdit }) {
  const toast = useToast();
  const ranked = useMemo(() => rankProducts(products), [products]);
  const shortlistSet = useMemo(() => new Set(shortlist || []), [shortlist]);

  return (
    <Modal open={open} onClose={onClose} title="Pick best products" width="lg">
      <div className="pickbest">
        <div className="pickbest-intro">
          <p>
            Your library ranked for promotion, based only on data we actually have: price, real discount,
            availability, image count and store/affiliate links. No ratings or reviews are invented.
          </p>
          <div className="pickbest-intro-actions">
            <Button
              size="sm"
              icon="star"
              disabled={ranked.length === 0}
              onClick={() => {
                onShortlistTop(ranked.slice(0, 5).map((entry) => entry.product.id));
                toast.success('Top 5 products shortlisted.');
              }}
            >
              Shortlist top 5
            </Button>
            {(shortlist || []).length > 0 && (
              <button type="button" className="link-button" onClick={() => { onShortlistTop([]); toast.info('Shortlist cleared.'); }}>
                Clear shortlist ({(shortlist || []).length})
              </button>
            )}
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="pickbest-empty">
            <Icon name="box" size={22} />
            <p>Import products first — then we can rank them for you.</p>
          </div>
        ) : (
          <ul className="pickbest-list">
            {ranked.map((entry, index) => {
              const product = entry.product;
              const image = primaryImage(product);
              const inShortlist = shortlistSet.has(product.id);
              return (
                <li key={product.id} className={`pickbest-row${inShortlist ? ' pickbest-row-shortlisted' : ''}`}>
                  <span className="pickbest-rank">{index + 1}</span>
                  <div className="pickbest-thumb">
                    {image ? <SafeImage src={image.url} alt="" /> : <Icon name="image" size={16} />}
                  </div>
                  <div className="pickbest-main">
                    <div className="pickbest-title-line">
                      <button type="button" className="pickbest-title" onClick={() => onEdit(product)} title="Open in editor">
                        {product.title || 'Untitled product'}
                      </button>
                      {product.source && product.source.platform && (
                        <PlatformBadge platformId={product.source.platform} label={product.source.platformLabel} />
                      )}
                    </div>
                    <ReasonChips entry={entry} />
                  </div>
                  <div className="pickbest-score">
                    <span className="pickbest-score-value">{entry.total}<span className="pickbest-score-max">/100</span></span>
                    <span className="pickbest-score-bar" aria-hidden="true">
                      <span className="pickbest-score-fill" style={{ width: `${entry.total}%` }} />
                    </span>
                    {product.price != null && <span className="pickbest-price">{formatCurrency(product.price, product.currency)}</span>}
                  </div>
                  <div className="pickbest-row-actions">
                    <IconButton
                      name="star"
                      label={inShortlist ? 'Remove from shortlist' : 'Add to shortlist'}
                      size="sm"
                      className={inShortlist ? 'pickbest-star-active' : ''}
                      onClick={() => onToggleShortlist(product.id)}
                    />
                    <IconButton name="edit" label="Edit product" size="sm" onClick={() => onEdit(product)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
