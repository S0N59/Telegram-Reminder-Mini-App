import React, { useRef, useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { X, Smile, Search } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { config } from '../../../../config';
import { telegramApiHeaders } from '../../../../utils/api';

interface EmojiPickerDropdownProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  isMobile?: boolean;
}

interface CatalogSticker {
  emoji: string;
  customEmojiId: string;
  thumbFileId: string | null;
}

interface CatalogSet {
  name: string;
  title: string;
  stickers: CatalogSticker[];
}

const thumbUrl = (fileId: string | null) =>
  fileId ? `${config.backendUrl}/api/upload?fileId=${encodeURIComponent(fileId)}` : null;

export const EmojiPickerDropdown: React.FC<EmojiPickerDropdownProps> = ({
  editor,
  isOpen,
  onClose,
  anchorEl,
  isMobile = false,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSmallScreen = isMobile || (typeof window !== 'undefined' && window.innerWidth < 900);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    if (anchorEl && !isSmallScreen) {
      const rect = anchorEl.getBoundingClientRect();
      const width = 320;
      const left = Math.max(12, Math.min(rect.left - 120, window.innerWidth - width - 16));
      const top = rect.bottom + 8;
      setCoords({ top, left });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, anchorEl, isSmallScreen, onClose]);

  useEffect(() => {
    if (!isOpen || sets.length > 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${config.backendUrl}/api/emoji`, { headers: telegramApiHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Telegram emoji catalog is unavailable');
        }
        return data.sets as CatalogSet[];
      })
      .then((nextSets) => {
        if (!cancelled) setSets(Array.isArray(nextSets) ? nextSets : []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load Telegram emoji');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, sets.length]);

  if (!isOpen || !editor) return null;

  const query = searchQuery.trim().toLowerCase();
  const visibleSets = sets
    .map((set) => ({
      ...set,
      stickers: query
        ? set.stickers.filter(
            (sticker) =>
              sticker.emoji.toLowerCase().includes(query) ||
              set.title.toLowerCase().includes(query) ||
              set.name.toLowerCase().includes(query)
          )
        : set.stickers,
    }))
    .filter((set) => set.stickers.length > 0);

  const handleSelectEmoji = (sticker: CatalogSticker) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    editor
      .chain()
      .focus()
      .insertTelegramEmoji({
        emojiId: sticker.customEmojiId,
        fallback: sticker.emoji,
        thumbUrl: thumbUrl(sticker.thumbFileId),
      })
      .run();
    onClose();
  };

  return (
    <OverlayPortal>
      <div
        className="insert-block-backdrop animate-fade-in"
        onClick={onClose}
        onTouchStart={(e) => e.stopPropagation()}
      />

      <div
        ref={dropdownRef}
        className={`tg-emoji-picker-container ${isSmallScreen ? 'is-mobile-sheet' : 'is-desktop-popover'} animate-fade-in`}
        style={
          !isSmallScreen && coords
            ? {
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 10000,
              }
            : undefined
        }
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tg-emoji-picker-header">
          {isSmallScreen && <div className="sheet-drag-handle" />}
          <div className="sheet-title-row">
            <div className="tg-emoji-header-left">
              <Smile size={16} style={{ color: '#38bdf8' }} />
              <div className="sheet-title-col">
                <span className="tg-emoji-title">Telegram Emoji</span>
                <span className="sheet-subtitle">Custom emoji the bot can send</span>
              </div>
            </div>
            <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="sheet-search-row">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="sheet-search-input"
              placeholder="Search Telegram emoji…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="tg-emoji-picker-scroll">
          {loading && (
            <div className="sheet-empty-state">
              <Smile size={20} />
              <span>Loading emoji from Telegram…</span>
            </div>
          )}

          {!loading && error && (
            <div className="sheet-empty-state">
              <Smile size={20} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && visibleSets.length === 0 && (
            <div className="sheet-empty-state">
              <Search size={20} />
              <span>
                {query
                  ? `No Telegram emoji match “${searchQuery}”`
                  : 'No custom emoji packs are available to this bot yet'}
              </span>
            </div>
          )}

          {!loading &&
            !error &&
            visibleSets.map((set) => (
              <div key={set.name} className="tg-emoji-group">
                <div className="tg-emoji-group-title">{set.title}</div>
                <div className="tg-emoji-grid">
                  {set.stickers.map((sticker) => {
                    const src = thumbUrl(sticker.thumbFileId);
                    return (
                      <button
                        key={sticker.customEmojiId}
                        type="button"
                        className="tg-emoji-btn"
                        title={sticker.emoji}
                        onClick={() => handleSelectEmoji(sticker)}
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={sticker.emoji}
                            className="tg-emoji-thumb"
                            loading="lazy"
                          />
                        ) : (
                          sticker.emoji
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </OverlayPortal>
  );
};
