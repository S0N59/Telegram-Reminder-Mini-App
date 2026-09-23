import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Unlink, X, Check, Plus, Trash2, MousePointerClick } from 'lucide-react';
import { PostInlineButton } from '../types/editor';
import { OverlayPortal } from './OverlayPortal';

interface LinkModalProps {
  isOpen: boolean;
  initialUrl?: string;
  selectedText?: string;
  onApply: (url: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  buttons?: PostInlineButton[][];
  onUpdateButtons?: (buttons: PostInlineButton[][]) => void;
  initialTab?: 'text' | 'buttons';
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  initialUrl = '',
  selectedText = '',
  onApply,
  onRemove,
  onClose,
  buttons = [],
  onUpdateButtons,
  initialTab = 'text',
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'buttons'>(initialTab);
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Button input states
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || 'https://');
      if (!selectedText && buttons.flat().length > 0 && !initialUrl) {
        setActiveTab('buttons');
      } else {
        setActiveTab(initialTab);
      }
      setTimeout(() => {
        if (inputRef.current && activeTab === 'text') {
          inputRef.current.focus();
          if (initialUrl) {
            inputRef.current.select();
          } else {
            inputRef.current.setSelectionRange(8, 8);
          }
        }
      }, 50);
    }
  }, [isOpen, initialUrl, selectedText, initialTab]);

  if (!isOpen) return null;

  const handleTextLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = url.trim();
    if (!trimmed) {
      onRemove?.();
      onClose();
      return;
    }
    if (!/^https?:\/\//i.test(trimmed) && !/^tg:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    onApply(trimmed);
    onClose();
  };

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!btnText.trim() || !btnUrl.trim()) return;

    let targetUrl = btnUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl) && !/^tg:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const newBtn: PostInlineButton = {
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: btnText.trim(),
      url: targetUrl,
    };

    if (onUpdateButtons) {
      onUpdateButtons([...buttons, [newBtn]]);
    }
    setBtnText('');
    setBtnUrl('');
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  const handleRemoveButton = (rowIdx: number, colIdx: number) => {
    if (!onUpdateButtons) return;
    const updated = buttons
      .map((row, r) => {
        if (r !== rowIdx) return row;
        return row.filter((_, c) => c !== colIdx);
      })
      .filter((row) => row.length > 0);
    onUpdateButtons(updated);
  };

  const totalButtons = buttons.flat().length;

  return (
    <OverlayPortal>
      <AnimatePresence>
        <div className="link-modal-backdrop" onClick={onClose}>
          <motion.div
            className="link-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="link-modal-header">
              <div className="link-modal-title">
                <Link size={17} className="link-modal-icon" />
                <span>Links & Buttons</span>
              </div>
              <button
                type="button"
                className="link-modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="media-type-selector" style={{ marginBottom: '14px' }}>
              <button
                type="button"
                className={`media-type-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                <Link size={14} />
                <span>In Text</span>
              </button>

              <button
                type="button"
                className={`media-type-btn ${activeTab === 'buttons' ? 'active' : ''}`}
                onClick={() => setActiveTab('buttons')}
              >
                <MousePointerClick size={14} />
                <span>Inline Buttons {totalButtons > 0 ? `(${totalButtons})` : ''}</span>
              </button>
            </div>

          {/* TAB 1: TEXT LINK */}
          {activeTab === 'text' && (
            <form onSubmit={handleTextLinkSubmit} className="link-tab-body">
              {selectedText ? (
                <div className="link-modal-context">
                  <span className="link-context-label">Selected text:</span>
                  <span className="link-context-text">"{selectedText}"</span>
                </div>
              ) : (
                <div className="link-modal-context hint">
                  <span className="link-context-label">Tip:</span>
                  <span className="link-context-text">Select text in the editor before adding a link, or paste a link directly.</span>
                </div>
              )}

              <div className="link-input-group">
                <input
                  ref={inputRef}
                  type="url"
                  className="link-url-input"
                  placeholder="https://t.me/channel or https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="link-modal-actions">
                {initialUrl && onRemove && (
                  <button
                    type="button"
                    className="link-btn-remove"
                    onClick={() => {
                      onRemove();
                      onClose();
                    }}
                  >
                    <Unlink size={15} />
                    <span>Remove</span>
                  </button>
                )}

                <div className="link-modal-right-actions">
                  <button
                    type="button"
                    className="link-btn-cancel"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="link-btn-apply"
                    disabled={!url.trim()}
                  >
                    <Check size={15} />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: INLINE BUTTONS */}
          {activeTab === 'buttons' && (
            <div className="link-tab-body">
              <div className="link-modal-context hint">
                <span className="link-context-label">Inline Buttons:</span>
                <span className="link-context-text">Appear as interactive buttons directly attached below your Telegram post.</span>
              </div>

              <form onSubmit={handleAddButton} className="add-button-form">
                <div className="link-inputs-vertical">
                  <input
                    type="text"
                    className="link-url-input"
                    placeholder="Button label (e.g. Visit Website)"
                    value={btnText}
                    onChange={(e) => setBtnText(e.target.value)}
                  />
                  <input
                    type="url"
                    className="link-url-input"
                    placeholder="Button URL (https://... or https://t.me/...)"
                    value={btnUrl}
                    onChange={(e) => setBtnUrl(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="add-inline-btn-submit"
                  disabled={!btnText.trim() || !btnUrl.trim()}
                >
                  <Plus size={15} />
                  <span>Add Button</span>
                </button>
              </form>

              {/* Added Buttons List */}
              <div className="inline-buttons-list-wrap">
                <span className="inline-buttons-list-title">Attached Buttons ({totalButtons}):</span>
                {totalButtons === 0 ? (
                  <div className="empty-buttons-hint">No buttons added yet</div>
                ) : (
                  <div className="inline-buttons-chips-grid">
                    {buttons.map((row, rIdx) =>
                      row.map((btn, cIdx) => (
                        <div key={btn.id} className="button-chip-item">
                          <div className="button-chip-left">
                            <span className="button-chip-label">{btn.text}</span>
                            <span className="button-chip-url">{btn.url}</span>
                          </div>
                          <button
                            type="button"
                            className="button-chip-remove"
                            onClick={() => handleRemoveButton(rIdx, cIdx)}
                            title="Remove button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="link-modal-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="link-btn-apply"
                  style={{ width: '100%' }}
                  onClick={onClose}
                >
                  <Check size={15} />
                  <span>Done ({totalButtons} buttons)</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  </OverlayPortal>
  );
};
