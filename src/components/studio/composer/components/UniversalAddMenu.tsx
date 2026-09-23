import React, { useState, useRef } from 'react';
import {
  Plus,
  Image as ImageIcon,
  Paperclip,
  Quote,
  Code,
  Type,
  X,
} from 'lucide-react';

interface UniversalAddMenuProps {
  onAddImages: (files: FileList) => void;
  onAddFile: (file: File) => void;
  onAddQuote: () => void;
  onAddCode: () => void;
  onAddText: () => void;
  isInline?: boolean;
}

export const UniversalAddMenu: React.FC<UniversalAddMenuProps> = ({
  onAddImages,
  onAddFile,
  onAddQuote,
  onAddCode,
  onAddText,
  isInline = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    setIsOpen((v) => !v);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
      setIsOpen(false);
    }
    // reset input
    e.target.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFile(e.target.files[0]);
      setIsOpen(false);
    }
    e.target.value = '';
  };

  return (
    <div className={`universal-add-container ${isInline ? 'inline-mode' : 'bottom-mode'}`}>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Main Trigger Button */}
      <button
        type="button"
        className={`universal-add-btn ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label="Add content block"
        title="Add to post"
      >
        <Plus size={18} className="add-icon" />
        {!isInline && <span className="add-label">Add Content</span>}
      </button>

      {/* Quick Selection Popover / Sheet */}
      {isOpen && (
        <>
          <div className="universal-menu-backdrop" onClick={() => setIsOpen(false)} />
          <div className="universal-add-menu animate-scale-in">
            <div className="add-menu-header">
              <span>Add to post</span>
              <button
                type="button"
                className="add-menu-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="add-menu-grid">
              {/* 1. Images / Album */}
              <button
                type="button"
                className="add-menu-card"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="card-icon-bubble image">
                  <ImageIcon size={18} />
                </div>
                <div className="card-texts">
                  <span className="card-title">Image / Album</span>
                  <span className="card-desc">1 to 10 photos in grid</span>
                </div>
              </button>

              {/* 2. File Attachment */}
              <button
                type="button"
                className="add-menu-card"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="card-icon-bubble file">
                  <Paperclip size={18} />
                </div>
                <div className="card-texts">
                  <span className="card-title">File</span>
                  <span className="card-desc">PDF, ZIP, document</span>
                </div>
              </button>

              {/* 3. Quote */}
              <button
                type="button"
                className="add-menu-card"
                onClick={() => {
                  onAddQuote();
                  setIsOpen(false);
                }}
              >
                <div className="card-icon-bubble quote">
                  <Quote size={18} />
                </div>
                <div className="card-texts">
                  <span className="card-title">Quote</span>
                  <span className="card-desc">Telegram styled quote</span>
                </div>
              </button>

              {/* 4. Code Block */}
              <button
                type="button"
                className="add-menu-card"
                onClick={() => {
                  onAddCode();
                  setIsOpen(false);
                }}
              >
                <div className="card-icon-bubble code">
                  <Code size={18} />
                </div>
                <div className="card-texts">
                  <span className="card-title">Code Block</span>
                  <span className="card-desc">Formatted code snippet</span>
                </div>
              </button>

              {/* 5. Text Block */}
              <button
                type="button"
                className="add-menu-card"
                onClick={() => {
                  onAddText();
                  setIsOpen(false);
                }}
              >
                <div className="card-icon-bubble text">
                  <Type size={18} />
                </div>
                <div className="card-texts">
                  <span className="card-title">Text Block</span>
                  <span className="card-desc">New paragraph</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
