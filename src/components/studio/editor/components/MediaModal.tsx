import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image as ImageIcon,
  Video,
  Music,
  Plus,
  Trash2,
  EyeOff,
  UploadCloud,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { PostMedia } from '../types/editor';
import { OverlayPortal } from './OverlayPortal';
import { uploadMediaFileAPI } from '../../../../utils/channelStorage';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: PostMedia[];
  onUpdateMedia: (media: PostMedia[]) => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  onClose,
  media,
  onUpdateMedia,
}) => {
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'audio'>('photo');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPT: Record<typeof mediaType, string> = {
    photo: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
  };

  const SIZE_HINT: Record<typeof mediaType, string> = {
    photo: 'JPG, PNG, WebP — up to 10 MB',
    video: 'MP4, MOV — up to 50 MB',
    audio: 'MP3, M4A, OGG — up to 50 MB',
  };

  const handlePickFile = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires a change event.
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploadingName(file.name);

    const result = await uploadMediaFileAPI(file, mediaType);
    setUploadingName(null);

    if (!result.ok || !result.fileId) {
      setUploadError(result.error || 'Upload failed');
      try {
        (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
      } catch {}
      return;
    }

    onUpdateMedia([
      ...media,
      {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: mediaType,
        // Telegram accepts a file_id anywhere a media URL is expected.
        url: result.fileId,
        fileId: result.fileId,
        previewUrl: result.previewUrl,
        fileName: file.name,
        isSpoiler: mediaType !== 'audio' ? isSpoiler : false,
      },
    ]);
    setIsSpoiler(false);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  if (!isOpen) return null;

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    let targetUrl = mediaUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const newMediaItem: PostMedia = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: mediaType,
      url: targetUrl,
      isSpoiler: mediaType !== 'audio' ? isSpoiler : false,
    };

    onUpdateMedia([...media, newMediaItem]);
    setMediaUrl('');
    setIsSpoiler(false);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  const handleToggleSpoiler = (id: string) => {
    onUpdateMedia(
      media.map((m) => (m.id === id ? { ...m, isSpoiler: !m.isSpoiler } : m))
    );
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
  };

  const handleRemoveMedia = (id: string) => {
    onUpdateMedia(media.filter((m) => m.id !== id));
  };

  return (
    <OverlayPortal>
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
              <div className="channel-modal-icon-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
                <ImageIcon size={18} />
              </div>
              <div>
                <h3 className="channel-modal-title">Media Attachments</h3>
                <p className="channel-modal-sub">Attach photos, videos, or audio to your post</p>
              </div>
            </div>
            <button type="button" className="channel-modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Media Form */}
          <div className="media-tab-content" style={{ marginTop: '14px' }}>
            <form onSubmit={handleAddMedia} className="add-media-form">
              {/* Type Switcher */}
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

              {/* Upload straight from the device (phone gallery / desktop files) */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT[mediaType]}
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <button
                type="button"
                className={`media-upload-dropzone ${uploadingName ? 'is-uploading' : ''}`}
                onClick={handlePickFile}
                disabled={!!uploadingName}
              >
                {uploadingName ? (
                  <>
                    <Loader2 size={20} className="media-upload-spinner" />
                    <span className="media-upload-title">Uploading “{uploadingName}”…</span>
                    <span className="media-upload-hint">Sending the file to Telegram</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={20} />
                    <span className="media-upload-title">
                      Upload {mediaType} from this device
                    </span>
                    <span className="media-upload-hint">
                      <Smartphone size={11} />
                      <span>{SIZE_HINT[mediaType]}</span>
                    </span>
                  </>
                )}
              </button>

              {uploadError && <div className="media-upload-error">{uploadError}</div>}

              <div className="media-input-divider">
                <span>or paste a direct link</span>
              </div>

              {/* URL Input Row with visible border & stylish button */}
              <div className="media-input-row">
                <input
                  type="url"
                  className="media-url-input"
                  placeholder={
                    mediaType === 'photo'
                      ? 'Direct photo URL (https://.../photo.jpg)'
                      : mediaType === 'video'
                      ? 'Direct MP4 video URL (https://.../video.mp4)'
                      : 'Direct MP3 audio URL (https://.../audio.mp3)'
                  }
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
                <button
                  type="submit"
                  className="add-media-btn"
                  disabled={!mediaUrl.trim()}
                >
                  <Plus size={15} />
                  <span>Add</span>
                </button>
              </div>

              {mediaType !== 'audio' && (
                <div className="media-spoiler-toggle-row">
                  <button
                    type="button"
                    className={`media-spoiler-switch-btn ${isSpoiler ? 'active' : ''}`}
                    onClick={() => setIsSpoiler(!isSpoiler)}
                    aria-pressed={isSpoiler}
                  >
                    <div className="media-spoiler-switch-left">
                      <EyeOff size={15} className="spoiler-icon" />
                      <span className="media-spoiler-text">Hide behind Telegram Spoiler</span>
                    </div>
                    <div className={`media-custom-toggle-pill ${isSpoiler ? 'active' : ''}`}>
                      <div className="toggle-thumb" />
                    </div>
                  </button>
                </div>
              )}
            </form>

            {/* Attached Media List */}
            <div className="media-items-list-wrap">
              <span className="media-items-list-title">
                Attached Media ({media.length}):
              </span>
              {media.length === 0 ? (
                <div className="empty-media-hint">
                  No media attached yet. Upload a file from your device or paste a direct URL.
                </div>
              ) : (
                <div className="media-cards-grid">
                  {media.map((item) => (
                    <div key={item.id} className="media-card-preview">
                      <div className="media-card-thumb">
                        {item.type === 'photo' && (
                          <img
                            src={item.previewUrl || item.url}
                            alt="Media preview"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        {item.type === 'video' && <Video size={24} />}
                        {item.type === 'audio' && <Music size={24} />}
                      </div>
                      <div className="media-card-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="media-card-type">{item.type.toUpperCase()}</span>
                          {item.fileId && (
                            <span className="media-card-file-badge">
                              <Smartphone size={9} />
                              <span>FILE</span>
                            </span>
                          )}
                          {item.isSpoiler && (
                            <span className="media-card-spoiler-badge" style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              SPOILER
                            </span>
                          )}
                        </div>
                        <span className="media-card-url">
                          {item.fileName || item.url}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.type !== 'audio' && (
                          <button
                            type="button"
                            className={`media-card-spoiler-btn ${item.isSpoiler ? 'active' : ''}`}
                            onClick={() => handleToggleSpoiler(item.id)}
                            title={item.isSpoiler ? 'Remove spoiler' : 'Add spoiler'}
                            style={{
                              background: item.isSpoiler ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.06)',
                              color: item.isSpoiler ? '#38bdf8' : 'inherit',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="media-card-delete"
                          onClick={() => handleRemoveMedia(item.id)}
                          title="Remove media"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </OverlayPortal>
  );
};
