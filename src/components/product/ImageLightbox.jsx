import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { IconButton } from '../ui/Button.jsx';
import { SafeImage } from '../ui/SafeImage.jsx';

export function ImageLightbox({ image, images, onClose }) {
  const [index, setIndex] = useState(() => Math.max(0, images.findIndex((item) => item.id === image.id)));
  const current = images[index] || image;

  useEffect(() => {
    setIndex(Math.max(0, images.findIndex((item) => item.id === image.id)));
  }, [image, images]);

  const move = (delta) => {
    if (images.length <= 1) return;
    setIndex((prev) => (prev + delta + images.length) % images.length);
  };

  return (
    <Modal open onClose={onClose} title="Image preview" width="lg" closeOnBackdrop>
      <div className="lightbox">
        <SafeImage
          key={current.id}
          className="lightbox-safe"
          imageClassName="lightbox-image"
          src={current.url}
          alt={current.alt || 'Product image'}
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <div className="lightbox-footer">
        <span className="lightbox-count">
          {index + 1} of {images.length}
        </span>
        <div className="lightbox-actions">
          <IconButton name="chevronLeft" label="Previous image" onClick={() => move(-1)} disabled={images.length <= 1} />
          <IconButton name="chevronRight" label="Next image" onClick={() => move(1)} disabled={images.length <= 1} />
        </div>
      </div>
    </Modal>
  );
}
