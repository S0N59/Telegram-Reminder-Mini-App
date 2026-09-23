import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Check,
  MoreHorizontal,
  Trash2,
  Copy,
  Code2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ComposerSaveState, SerializedPostOutput } from '../types/composer';

interface ComposerHeaderProps {
  onBack: () => void;
  title: string;
  onTitleChange: (newTitle: string) => void;
  saveState: ComposerSaveState;
  serialized: SerializedPostOutput;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  onClearPost: () => void;
  onCopyFormat: (format: 'html' | 'markdown' | 'text') => void;
}

export const ComposerHeader: React.FC<ComposerHeaderProps> = ({
  onBack,
  title,
  onTitleChange,
  saveState,
  serialized,
  onTogglePreview,
  isPreviewOpen,
  onClearPost,
  onCopyFormat,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const getSaveBadge = () => {
    switch (saveState) {
      case 'saving':
        return (
          <div className="composer-save-pill saving">
            <span className="save-pulse-dot" />
            <span>Saving...</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="composer-save-pill unsaved">
            <span className="save-dot unsaved" />
            <span>Unsaved</span>
          </div>
        );
      case 'error':
        return (
          <div className="composer-save-pill error">
            <span className="save-dot error" />
            <span>Not saved</span>
          </div>
        );
      case 'saved':
      default:
        return (
          <div className="composer-save-pill saved">
            <Check size={11} className="save-check-icon" />
            <span>Saved</span>
          </div>
        );
    }
  };

  return (
    <header className="composer-header">
      {/* Left Column: Back & Title */}
      <div className="composer-header-left">
        <button
          type="button"
          className="composer-back-btn"
          onClick={onBack}
          aria-label="Back to Studio"
        >
          <ArrowLeft size={17} />
          <span>Studio</span>
        </button>

        <div className="composer-title-container">
          {isEditingTitle ? (
            <input
              type="text"
              className="composer-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
            />
          ) : (
            <h1
              className="composer-title-text"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
            >
              {title || 'New Post'}
            </h1>
          )}
          {getSaveBadge()}
        </div>
      </div>

      {/* Right Column: Actions */}
      <div className="composer-header-right">
        {/* Preview Button */}
        <button
          type="button"
          className={`composer-preview-btn ${isPreviewOpen ? 'active' : ''}`}
          onClick={onTogglePreview}
          title="Toggle Telegram Preview"
        >
          <Eye size={15} />
          <span className="preview-label">Preview</span>
          {serialized.characterCount > 0 && (
            <span className={`preview-counter ${serialized.isOverLimit ? 'over-limit' : ''}`}>
              {serialized.characterCount}
            </span>
          )}
        </button>

        {/* More Actions Menu */}
        <div className="composer-more-menu-wrap">
          <button
            type="button"
            className="composer-icon-btn"
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            aria-label="More actions"
          >
            <MoreHorizontal size={17} />
          </button>

          {isMoreMenuOpen && (
            <div
              className="composer-popover-menu animate-fade-in"
              onClick={() => setIsMoreMenuOpen(false)}
            >
              <div className="popover-menu-section-label">Copy Telegram Format</div>
              <button
                type="button"
                className="popover-menu-item"
                onClick={() => onCopyFormat('html')}
              >
                <Code2 size={15} />
                <span>Copy Telegram HTML</span>
              </button>

              <button
                type="button"
                className="popover-menu-item"
                onClick={() => onCopyFormat('markdown')}
              >
                <FileText size={15} />
                <span>Copy Telegram MarkdownV2</span>
              </button>

              <button
                type="button"
                className="popover-menu-item"
                onClick={() => onCopyFormat('text')}
              >
                <Copy size={15} />
                <span>Copy Plain Text</span>
              </button>

              <div className="popover-menu-divider" />

              <button
                type="button"
                className="popover-menu-item danger"
                onClick={onClearPost}
              >
                <Trash2 size={15} />
                <span>Clear Entire Post</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
