export function normalizeImageUrl(url, platform) {
  if (platform === 'amazon') {
    return url
      .replace(/\._[A-Z0-9_]+_[A-Z0-9]+_\./g, '.')
      .replace(/\._AC_SL\d+_\./g, '.')
      .replace(/\._SY\d+_\./g, '.')
      .replace(/\._SX\d+_\./g, '.');
  }
  if (platform === 'etsy') {
    return url
      .replace(/__SX\d+__/g, '__')
      .replace(/__SY\d+__/g, '__')
      .replace(/il_([a-z0-9]+)x([a-z0-9]+)/i, 'il_fullxfull');
  }
  return url;
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
