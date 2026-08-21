import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../icons/Icons.jsx';
import { PlatformBadge } from '../ui/Badge.jsx';
import { useToast } from '../ui/ToastProvider.jsx';
import { copyText } from '../../services/exportService.js';
import { resolvePurchaseHref, safeExternalHref, displayUrl } from '../../utils/url.js';

/**
 * "Run Ad" / promote a product.
 *
 * Today no ad-platform API is connected, so this intentionally does NOT
 * create campaigns or pretend to. It surfaces the product's real
 * affiliate/store link (the exact URL the storefront redirects to) so it
 * can be pasted into any ad channel, and opens the product for reference.
 */
export function PromoteDialog({ product, onClose, onEdit }) {
  const toast = useToast();
  const href = product ? resolvePurchaseHref(product) : '';
  const source = (product && product.source) || {};

  const handleCopy = async () => {
    if (!href) return;
    await copyText(href);
    toast.success('Product link copied. Use it in your ad or campaign.');
  };

  const handleOpen = () => {
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal open={Boolean(product)} onClose={onClose} title="Promote product" width="sm">
      <div className="promote">
        <div className="promote-head">
          {product && product.title ? <p className="promote-title">{product.title}</p> : <p className="promote-title">Untitled product</p>}
          {source.platform && <PlatformBadge platformId={source.platform} label={source.platformLabel} />}
        </div>

        {href ? (
          <>
            <p className="promote-label">Affiliate / product link</p>
            <div className="promote-link">
              <code className="promote-link-code" title={href}>
                {displayUrl(href, 96)}
              </code>
            </div>
            <div className="promote-actions">
              <Button size="sm" icon="copy" onClick={handleCopy}>
                Copy link
              </Button>
              <Button size="sm" variant="secondary" icon="external" onClick={handleOpen}>
                Open product
              </Button>
            </div>
          </>
        ) : (
          <div className="promote-missing">
            <Icon name="alertTriangle" size={18} />
            <p>This product has no store or affiliate link yet, so there is nothing to promote.</p>
            {onEdit && (
              <Button size="sm" variant="secondary" icon="edit" onClick={onEdit}>
                Add a link in the editor
              </Button>
            )}
          </div>
        )}

        <p className="promote-note">
          No ad platform is connected to this app yet. Use the link above in your own campaigns (Meta, Google,
          email, social) — affiliate parameters stay intact.
        </p>
      </div>
    </Modal>
  );
}
