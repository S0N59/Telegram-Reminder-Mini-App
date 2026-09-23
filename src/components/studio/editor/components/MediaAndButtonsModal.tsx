import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video, Music, Plus, Trash2, Link as LinkIcon, Sparkles } from 'lucide-react';
import { PostMedia, PostInlineButton } from '../types/editor';

interface MediaAndButtonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: PostMedia[];
  onUpdateMedia: (media: PostMedia[]) => void;
  buttons: PostInlineButton[][];
  onUpdateButtons: (buttons: PostInlineButton[][]) => void;
}

export const MediaAndButtonsModal: React.FC<MediaAndButtonsModalProps> = ({
  isOpen,
  onClose,
  media,
  onUpdateMedia,
  buttons,
  onUpdateButtons,
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'buttons'>('media');

  // Media input state
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio'>('photo');
  const [mediaUrl, setMediaUrl] = useState('');

  // Button input state
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');

  if (!isOpen) return null;

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    const newMediaItem: PostMedia = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: mediaType,
      url: mediaUrl.trim(),
    };

    onUpdateMedia([...media, newMediaItem]);
    setMediaUrl('');
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  const handleRemoveMedia = (id: string) => {
    onUpdateMedia(media.filter((m) => m.id !== id));
  };

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!btnText.trim() || !btnUrl.trim()) return;

    const newBtn: PostInlineButton = {
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: btnText.trim(),
      url: btnUrl.trim(),
    };

    // Add as a new row or append
    onUpdateButtons([...buttons, [newBtn]]);
    setBtnText('');
    setBtnUrl('');
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  const handleRemoveButton = (rowIdx: number, colIdx: number) => {
    const updated = buttons.map((row, r) => {
      if (r !== rowIdx) return row;
      return row.filter((_, c) => c !== colIdx);
    }).filter(row => row.length > 0);
    onUpdateButtons(updated);
  };

  return (
    <AnimatePresence>
      <div className="channel-modal-backdrop" onClick={onClose}>
        <motion.div
          className="channel-modal-content media-buttons-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="channel-modal-header">
            <div className="channel-modal-title-row">
              <div className="channel-modal-icon-badge">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="channel-modal-title">Post Attachments & Buttons</h3>
                <p className="channel-modal-sub">Add photos, video, audio & interactive Telegram buttons</p>
              </div>
            </div>
            <button type="button" className="channel-modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="media-modal-tabs">
            <button
              type="button"
              className={`media-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              <ImageIcon size={15} />
              <span>Media ({media.length})</span>
            </button>
            <button
              type="button"
              className={`media-tab-btn ${activeTab === 'buttons' ? 'active' : ''}`}
              onClick={() => setActiveTab('buttons')}
            >
              <LinkIcon size={15} />
              <span>Inline Buttons ({buttons.flat().length})</span>
            </button>
          </div>

          {/* TAB 1: MEDIA */}
          {activeTab === 'media' && (
            <div className="media-tab-content">
              <form onSubmit={handleAddMedia} className="add-media-form">
                <div className="media-type-selector">
                  <button
                    type="button"
                    className={`media-type-btn ${mediaType === 'photo' ? 'active' : ''}`}
                    onClick={() => setMediaType('photo')}
                  >
                    <ImageIcon size={14} />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    className={`media-type-btn ${mediaType === 'video' ? 'active' : ''}`}
                    onClick={() => setMediaType('video')}
                  >
                    <Video size={14} />
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    className={`media-type-btn ${mediaType === 'audio' ? 'active' : ''}`}
                    onClick={() => setMediaType('audio')}
                  >
                    <Music size={14} />
                    <span>Audio</span>
                  </button>
                </div>

                <div className="channel-input-wrap">
                  <input
                    type="url"
                    className="channel-text-input"
                    placeholder="Paste direct media URL (https://...)"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="channel-link-submit-btn"
                    disabled={!mediaUrl.trim()}
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Media preview list */}
              <div className="attached-media-list">
                {media.length === 0 ? (
                  <div className="empty-media-hint">No media attached yet. Add photo or video URLs above.</div>
                ) : (
                  media.map((item, idx) => (
                    <div key={item.id} className="attached-media-item">
                      <div className="attached-media-thumb-wrap">
                        {item.type === 'photo' && <img src={item.url} alt="Attached" className="media-thumb-img" />}
                        {item.type === 'video' && <div className="media-thumb-placeholder"><Video size={20} /></div>}
                        {item.type === 'audio' && <div className="media-thumb-placeholder"><Music size={20} /></div>}
                      </div>
                      <div className="attached-media-info">
                        <span className="media-item-type">{item.type.toUpperCase()} #{idx + 1}</span>
                        <span className="media-item-url">{item.url}</span>
                      </div>
                      <button
                        type="button"
                        className="channel-unlink-btn"
                        onClick={() => handleRemoveMedia(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INLINE BUTTONS */}
          {activeTab === 'buttons' && (
            <div className="buttons-tab-content">
              <form onSubmit={handleAddButton} className="add-button-form">
                <input
                  type="text"
                  className="channel-text-input"
                  placeholder="Button Label (e.g. Visit Website ?)"
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                />
                <div className="channel-input-wrap" style={{ marginTop: '8px' }}>
                  <input
                    type="url"
                    className="channel-text-input"
                    placeholder="URL (https://t.me/... or website)"
                    value={btnUrl}
                    onChange={(e) => setBtnUrl(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="channel-link-submit-btn"
                    disabled={!btnText.trim() || !btnUrl.trim()}
                  >
                    <Plus size={16} />
                    <span>Add Button</span>
                  </button>
                </div>
              </form>

              {/* Attached buttons list */}
              <div className="attached-buttons-list">
                {buttons.length === 0 ? (
                  <div className="empty-media-hint">No buttons added. These buttons appear beneath the post in Telegram.</div>
                ) : (
                  buttons.map((row, rIdx) => (
                    <div key={rIdx} className="button-row-preview">
                      {row.map((btn, cIdx) => (
                        <div key={btn.id} className="button-preview-chip">
                          <span className="button-chip-label">{btn.text}</span>
                          <span className="button-chip-url">{btn.url}</span>
                          <button
                            type="button"
                            className="button-chip-remove"
                            onClick={() => handleRemoveButton(rIdx, cIdx)}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
