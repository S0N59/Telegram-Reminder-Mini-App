import React, { useRef } from 'react';
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { MediaItem } from '../../types/composer';
import { createMediaItemFromFile } from '../../utils/fileUpload';

interface MediaGalleryBlockProps {
  id: string;
  items: MediaItem[];
  caption: string;
  onUpdateItems: (items: MediaItem[]) => void;
  onUpdateCaption: (caption: string) => void;
}

export const MediaGalleryBlock: React.FC<MediaGalleryBlockProps> = ({
  items,
  caption,
  onUpdateItems,
  onUpdateCaption,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: MediaItem[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const item = await createMediaItemFromFile(e.target.files[i]);
      newItems.push(item);
    }
    onUpdateItems([...items, ...newItems].slice(0, 10)); // Telegram limit 10 media in album
    e.target.value = '';
  };

  const handleRemove = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    onUpdateItems(updated);
  };

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onUpdateItems(updated);
  };

  const captionLength = caption.length;
  const isCaptionNearLimit = captionLength > 900;
  const isCaptionOverLimit = captionLength > 1024;

  const getGridClass = () => {
    const count = items.length;
    if (count === 1) return 'grid-single';
    if (count === 2) return 'grid-double';
    if (count === 3) return 'grid-triple';
    if (count === 4) return 'grid-quad';
    return 'grid-multi';
  };

  return (
    <div className="media-gallery-block-card">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleAddFiles}
      />

      {/* Media Album Header Strip */}
      <div className="media-block-header">
        <div className="media-count-badge">
          <ImageIcon size={14} />
          <span>{items.length} {items.length === 1 ? 'Media item' : 'Album items'}</span>
          <span className="max-indicator">(max 10)</span>
        </div>

        {items.length < 10 && (
          <button
            type="button"
            className="media-add-more-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={14} />
            <span>Add photo</span>
          </button>
        )}
      </div>

      {/* Telegram Album Grid */}
      <div className={`telegram-album-grid ${getGridClass()}`}>
        {items.map((item, idx) => (
          <div key={item.id} className="album-item-cell group">
            {item.type === 'video' ? (
              <video src={item.url} className="album-media-element" controls={false} />
            ) : (
              <img src={item.url} alt={item.name || 'Media'} className="album-media-element" />
            )}

            {/* Hover Action Controls Overlay */}
            <div className="album-item-actions">
              {idx > 0 && (
                <button
                  type="button"
                  className="album-ctrl-btn"
                  onClick={() => handleMove(idx, idx - 1)}
                  title="Move Left"
                >
                  <ChevronLeft size={13} />
                </button>
              )}

              {idx < items.length - 1 && (
                <button
                  type="button"
                  className="album-ctrl-btn"
                  onClick={() => handleMove(idx, idx + 1)}
                  title="Move Right"
                >
                  <ChevronRight size={13} />
                </button>
              )}

              <button
                type="button"
                className="album-ctrl-btn danger"
                onClick={() => handleRemove(idx)}
                title="Remove photo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Attached Media Caption */}
      <div className="media-caption-container">
        <div className="media-caption-input-wrap">
          <MessageSquare size={14} className="caption-icon" />
          <textarea
            className="media-caption-input"
            rows={2}
            placeholder="Add a caption to this album (optional)..."
            value={caption}
            onChange={(e) => onUpdateCaption(e.target.value)}
          />
        </div>

        <div className="media-caption-footer">
          <span className="caption-help">Caption is attached to media</span>
          <span
            className={`caption-counter ${isCaptionNearLimit ? 'near-limit' : ''} ${
              isCaptionOverLimit ? 'over-limit' : ''
            }`}
          >
            {captionLength} / 1,024 chars
          </span>
        </div>
      </div>
    </div>
  );
};
