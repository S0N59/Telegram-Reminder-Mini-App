import React, { useState } from 'react';
import {
  Copy,
  Check,
  Eye,
  Code2,
  FileText,
  AlertTriangle,
  File,
} from 'lucide-react';
import { PostDocument, SerializedPostOutput } from '../types/composer';
import { formatFileSize } from '../utils/fileUpload';

interface TelegramComposerPreviewProps {
  document: PostDocument;
  serialized: SerializedPostOutput;
  channelName?: string;
  onCopyFormat: (format: 'html' | 'markdown' | 'text') => void;
}

export const TelegramComposerPreview: React.FC<TelegramComposerPreviewProps> = ({
  document,
  serialized,
  channelName = 'Remigram Channel',
  onCopyFormat,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (format: 'html' | 'markdown' | 'text') => {
    onCopyFormat(format);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  const toggleSpoiler = (index: number) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    setRevealedSpoilers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Render HTML content with interactive spoilers
  const renderInteractiveHTML = (htmlContent: string) => {
    if (!htmlContent) return null;
    let spoilerIndex = 0;
    const processed = htmlContent.replace(
      /<tg-spoiler>(.*?)<\/tg-spoiler>/g,
      (_, content) => {
        const idx = spoilerIndex++;
        const isRevealed = !!revealedSpoilers[idx];
        return `<span class="tg-preview-spoiler ${isRevealed ? 'revealed' : ''}" data-spoiler-idx="${idx}">${content}</span>`;
      }
    );

    return (
      <div
        className="tg-bubble-html-text"
        dangerouslySetInnerHTML={{ __html: processed }}
        onClick={(e) => {
          const target = (e.target as HTMLElement).closest('.tg-preview-spoiler');
          if (target) {
            const idxStr = target.getAttribute('data-spoiler-idx');
            if (idxStr !== null) {
              toggleSpoiler(parseInt(idxStr, 10));
            }
          }
        }}
      />
    );
  };

  // Find media blocks
  const mediaBlocks = document.blocks.filter((b) => b.type === 'media_gallery');
  const hasMediaBlocks = mediaBlocks.length > 0;

  return (
    <div className="telegram-composer-preview-wrap">
      {/* Top Bar with Channel and Copy Format Pills */}
      <div className="tg-preview-top-bar">
        <div className="tg-preview-channel-pill">
          <div className="tg-preview-avatar">
            <span>{channelName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="tg-preview-channel-meta">
            <span className="tg-preview-channel-name">{channelName}</span>
            <span className="tg-preview-status">Live Post Preview</span>
          </div>
        </div>

        <div className="tg-copy-pills-row">
          <button
            type="button"
            className={`tg-copy-btn ${copiedFormat === 'html' ? 'copied' : ''}`}
            onClick={() => handleCopy('html')}
            title="Copy Telegram HTML"
          >
            {copiedFormat === 'html' ? <Check size={12} /> : <Code2 size={12} />}
            <span>HTML</span>
          </button>

          <button
            type="button"
            className={`tg-copy-btn ${copiedFormat === 'markdown' ? 'copied' : ''}`}
            onClick={() => handleCopy('markdown')}
            title="Copy Telegram MarkdownV2"
          >
            {copiedFormat === 'markdown' ? <Check size={12} /> : <FileText size={12} />}
            <span>MD-V2</span>
          </button>

          <button
            type="button"
            className={`tg-copy-btn ${copiedFormat === 'text' ? 'copied' : ''}`}
            onClick={() => handleCopy('text')}
            title="Copy Plain Text"
          >
            {copiedFormat === 'text' ? <Check size={12} /> : <Copy size={12} />}
            <span>Text</span>
          </button>
        </div>
      </div>

      {/* Warning banner if over Telegram limits */}
      {serialized.isOverLimit && (
        <div className="tg-limit-warning-banner">
          <AlertTriangle size={15} />
          <span>{serialized.limitErrorMessage}</span>
        </div>
      )}

      {/* Telegram Chat Wallpaper Pattern */}
      <div className="tg-wallpaper-canvas">
        <div className="tg-message-bubble-wrapper">
          <div className="tg-authentic-bubble">
            {/* 1. Media Blocks / Albums */}
            {document.blocks.map((block) => {
              if (block.type === 'media_gallery' && block.items.length > 0) {
                const count = block.items.length;
                const gridClass =
                  count === 1
                    ? 'preview-single'
                    : count === 2
                    ? 'preview-double'
                    : count === 3
                    ? 'preview-triple'
                    : 'preview-quad';

                return (
                  <div key={block.id} className="tg-preview-media-group">
                    <div className={`tg-preview-album-grid ${gridClass}`}>
                      {block.items.map((item) => (
                        <div key={item.id} className="tg-preview-media-cell">
                          {item.type === 'video' ? (
                            <video src={item.url} controls={false} />
                          ) : (
                            <img src={item.url} alt={item.name || 'Media'} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Attached Caption */}
                    {block.caption && (
                      <div className="tg-preview-caption-area">
                        {renderInteractiveHTML(block.caption)}
                      </div>
                    )}
                  </div>
                );
              }

              if (block.type === 'text' && block.content.trim()) {
                return (
                  <div key={block.id} className="tg-preview-text-block">
                    {renderInteractiveHTML(block.content)}
                  </div>
                );
              }

              if (block.type === 'quote' && block.text.trim()) {
                return (
                  <blockquote key={block.id} className="tg-preview-quote">
                    <p>{block.text}</p>
                    {block.author && <span className="tg-quote-source">— {block.author}</span>}
                  </blockquote>
                );
              }

              if (block.type === 'code' && block.code.trim()) {
                return (
                  <div key={block.id} className="tg-preview-code-box">
                    {block.language && <span className="code-lang-tag">{block.language}</span>}
                    <pre>
                      <code>{block.code}</code>
                    </pre>
                  </div>
                );
              }

              if (block.type === 'file') {
                return (
                  <div key={block.id} className="tg-preview-file-card">
                    <div className="tg-file-icon-bubble">
                      <File size={16} />
                    </div>
                    <div className="tg-file-info">
                      <span className="tg-file-name">{block.name}</span>
                      <span className="tg-file-size">{formatFileSize(block.size)}</span>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Empty state inside preview */}
            {document.blocks.length === 0 && (
              <span className="tg-preview-empty-hint">
                Start typing or add media to see your post live...
              </span>
            )}

            {/* Bubble Footer */}
            <div className="tg-bubble-meta-footer">
              <span className="tg-views-badge">
                <Eye size={12} />
                <span>1.4K</span>
              </span>
              <span className="tg-timestamp">{currentTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Counter Bar */}
      <div className="tg-preview-footer-stats">
        <div className="stat-item">
          <span className="stat-label">Characters:</span>
          <span className={`stat-number ${serialized.isOverLimit ? 'over-limit' : ''}`}>
            {serialized.hasMedia
              ? `${serialized.captionCharacterCount} / 1,024 (caption)`
              : `${serialized.characterCount} / 4,096`}
          </span>
        </div>

        {serialized.mediaCount > 0 && (
          <div className="stat-item">
            <span className="stat-label">Photos:</span>
            <span className="stat-number">{serialized.mediaCount} / 10</span>
          </div>
        )}

        {serialized.fileCount > 0 && (
          <div className="stat-item">
            <span className="stat-label">Files:</span>
            <span className="stat-number">{serialized.fileCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
