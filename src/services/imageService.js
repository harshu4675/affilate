const AMAZON_IMAGE_EXT = 'jpe?g|png|webp|gif';

/**
 * Reduce an Amazon image URL to its highest-quality (original) source.
 * Mirrors the server-side normalizer (`server/extraction/normalize.js`):
 * every size variant suffix (`._SL1500_.`, `._SL500_.`, `._AC_SL1500_.`,
 * `._AC_UL320_.`, `._SY445_.`, `._CB123_.`, ...) is stripped, leaving the
 * bare original URL — the largest version Amazon has of that photo.
 * Only the token directly before the image extension is touched, so the
 * image id and path are never altered.
 */
function stripAmazonVariants(value) {
  let next = value;
  let previous;
  const strip = new RegExp(`\\.[A-Z0-9_]+\\.(?:${AMAZON_IMAGE_EXT})$`, 'i');
  do {
    previous = next;
    next = next.replace(strip, (match) => match.slice(match.lastIndexOf('.')));
  } while (next !== previous);
  return next;
}

function isAmazonCdnUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'media-amazon.com' || host.endsWith('.media-amazon.com');
  } catch {
    return false;
  }
}

export function normalizeImageUrl(url, platform) {
  const value = String(url || '');
  // Amazon CDN images are always reduced to the original source, whether the
  // product's platform is "amazon" or the URL was pasted in manually.
  if (platform === 'amazon' || isAmazonCdnUrl(value)) {
    return stripAmazonVariants(value);
  }
  if (platform === 'etsy') {
    return value
      .replace(/__SX\d+__/g, '__')
      .replace(/__SY\d+__/g, '__')
      .replace(/il_([a-z0-9]+)x([a-z0-9]+)/i, 'il_fullxfull');
  }
  return value;
}

/**
 * If `url` is an Amazon CDN URL that still carries a size-variant suffix
 * (e.g. legacy data saved before the normalizer was fixed), return the
 * equivalent bare-original URL to retry with. Returns '' when there is
 * nothing safer to try.
 */
export function amazonRetryUrl(url) {
  const value = String(url || '');
  if (!/^https?:\/\//i.test(value)) return '';
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (!host.endsWith('media-amazon.com')) return '';
  } catch {
    return '';
  }
  const stripped = normalizeImageUrl(value, 'amazon');
  return stripped !== value ? stripped : '';
}

export function isValidImageSource(value) {
  if (!value) return false;
  if (/^data:image\//i.test(value)) return true;
  return /^https?:\/\//i.test(value);
}

export function compressImageFile(file, maxDimension = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', quality),
          width: canvas.width,
          height: canvas.height
        });
      };
      image.onerror = () => reject(new Error('could_not_read'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('could_not_read'));
    reader.readAsDataURL(file);
  });
}
