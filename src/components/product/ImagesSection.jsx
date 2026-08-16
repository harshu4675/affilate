import { useRef, useState } from 'react';
import { Section } from './Section.jsx';
import { Icon } from '../icons/Icons.jsx';
import { IconButton, Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { useToast } from '../ui/ToastProvider.jsx';
import { compressImageFile, isValidImageSource } from '../../services/imageService.js';
import { createId } from '../../utils/id.js';

export function ImagesSection({ product, onChange, onPreview }) {
  const toast = useToast();
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const fileRef = useRef(null);

  const images = product.images || [];
  const removedImages = product.removedImages || [];

  const applyImages = (nextImages, extra = {}) => {
    onChange('images', nextImages, extra);
  };

  const move = (from, to) => {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    applyImages(next.map((image, index) => ({ ...image, position: index, isPrimary: index === 0 ? true : image.isPrimary })));
  };

  const remove = (image) => {
    const removedPrimary = image.isPrimary;
    const next = images
      .filter((item) => item.id !== image.id)
      .map((item, index) => {
        const isPrimary = removedPrimary ? index === 0 : item.isPrimary;
        return { ...item, position: index, isPrimary };
      });
    if (!removedPrimary && next.length > 0 && !next.some((item) => item.isPrimary)) next[0].isPrimary = true;
    const removed = [...removedImages, { ...image, isPrimary: false }];
    onChange('images', next, { removedImages: removed });
    toast.info('Image removed. You can restore it before saving.');
  };

  const restore = (image) => {
    const nextRemoved = removedImages.filter((item) => item.id !== image.id);
    const nextImages = [...images, { ...image, isPrimary: images.length === 0 }];
    onChange('images', nextImages, { removedImages: nextRemoved });
  };

  const setPrimary = (id) => {
    applyImages(images.map((image) => ({ ...image, isPrimary: image.id === id })));
  };

  const addByUrl = () => {
    const value = urlInput.trim();
    if (!isValidImageSource(value)) {
      toast.error('Enter a valid image URL (http or https).');
      return;
    }
    const image = { id: createId('img'), url: value, alt: '', position: images.length, isPrimary: images.length === 0, source: 'user' };
    applyImages([...images, image]);
    setUrlInput('');
    setAddingUrl(false);
    toast.success('Image added.');
  };

  const handleUpload = async (files) => {
    const file = files && files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error('Only image files can be uploaded.');
      return;
    }
    setUploading(true);
    try {
      const { dataUrl } = await compressImageFile(file);
      const image = { id: createId('img'), url: dataUrl, alt: '', position: images.length, isPrimary: images.length === 0, source: 'user' };
      applyImages([...images, image]);
      toast.success('Image added.');
    } catch {
      toast.error('Could not read that image file.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Section
      title="Images"
      description="Reorder with drag or the arrows. The starred image is the primary one."
      actions={
        <span className="editor-section-count">
          {images.length} image{images.length === 1 ? '' : 's'}
        </span>
      }
    >
      {images.length > 0 && (
        <div className="image-grid">
          {images.map((image, index) => (
            <div
              className={`image-tile${image.isPrimary ? ' image-tile-primary' : ''}`}
              key={image.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex != null) move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              <button type="button" className="image-tile-preview" onClick={() => onPreview(image)}>
                <img src={image.url} alt={image.alt || 'Product image'} loading="lazy" decoding="async" />
              </button>
              {image.isPrimary && (
                <span className="image-tile-primary-badge" title="Primary image">
                  <Icon name="star" size={12} />
                </span>
              )}
              <div className="image-tile-actions">
                <IconButton name="chevronUp" label="Move earlier" size="sm" onClick={() => move(index, index - 1)} disabled={index === 0} />
                <IconButton name="chevronDown" label="Move later" size="sm" onClick={() => move(index, index + 1)} disabled={index === images.length - 1} />
                <IconButton name="star" label="Set as primary image" size="sm" onClick={() => setPrimary(image.id)} />
                <IconButton name="trash" label="Remove image" size="sm" onClick={() => remove(image)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {removedImages.length > 0 && (
        <div className="removed-images">
          <h4 className="removed-images-title">Removed images</h4>
          <div className="removed-images-list">
            {removedImages.map((image) => (
              <div className="removed-image" key={image.id}>
                <img src={image.url} alt="" loading="lazy" />
                <Button variant="ghost" size="sm" icon="undo" onClick={() => restore(image)}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="image-add-bar">
        {addingUrl ? (
          <div className="image-add-url">
            <Input
              type="url"
              placeholder="https://.../image.jpg"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addByUrl();
                }
                if (event.key === 'Escape') setAddingUrl(false);
              }}
              autoFocus
            />
            <Button size="sm" onClick={addByUrl}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingUrl(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" size="sm" icon="link" onClick={() => setAddingUrl(true)}>
              Add by URL
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="upload"
              loading={uploading}
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              {uploading ? 'Uploading' : 'Upload from device'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={(event) => handleUpload(event.target.files)}
            />
          </>
        )}
      </div>
    </Section>
  );
}
