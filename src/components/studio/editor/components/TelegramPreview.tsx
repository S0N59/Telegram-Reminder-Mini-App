import React, { useState } from 'react';
import { SerializedTelegramPost } from '../types/editor';
import { Copy, Eye, Code2, FileText, Play, ExternalLink, EyeOff, Sparkles, Check } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface TelegramPreviewProps {
  serialized: SerializedTelegramPost;
  channelName?: string;
  authorAvatar?: string;
  accentColor?: string;
}

export const TelegramPreview: React.FC<TelegramPreviewProps> = ({
  serialized,
  channelName = 'Remigram Studio',
  authorAvatar,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});
  const [revealedMediaSpoilers, setRevealedMediaSpoilers] = useState<Record<number, boolean>>({});
  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (format: 'html' | 'markdown' | 'text' | 'json') => {
    let contentToCopy = '';
    if (format === 'html') contentToCopy = serialized.html;
    else if (format === 'markdown') contentToCopy = serialized.markdownV2;
    else if (format === 'json') contentToCopy = JSON.stringify(serialized.richMessage || serialized.document, null, 2);
    else contentToCopy = serialized.plainText;

    if (!contentToCopy) return;

    navigator.clipboard.writeText(contentToCopy);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}

    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const toggleSpoiler = (index: number) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    setRevealedSpoilers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleExpandable = (index: number) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    setExpandedQuotes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Process HTML for interactive preview (Spoilers, Expandables, KaTeX Math)
  const renderInteractiveHTML = () => {
    // previewHtml is the block-wrapped twin of the Telegram HTML that actually gets sent.
    // The raw html fallback uses bare newlines, so turn them into real breaks.
    const sourceHtml = serialized.previewHtml || serialized.html.replace(/\n/g, '<br>');
    if (!sourceHtml) {
      return (
        <span className="tg-preview-empty-text">
          Start typing your Telegram post on the left to see live preview...
        </span>
      );
    }

    let rawHtml = sourceHtml;

    // 1. Render KaTeX Math (<tg-math-block>, <tg-math>, $$, $)
    try {
      // Telegram native block math <tg-math-block>
      rawHtml = rawHtml.replace(/<tg-math-block>([\s\S]*?)<\/tg-math-block>/g, (_, math) => {
        try {
          return `<div class="tg-katex-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch {
          return math;
        }
      });
      // Telegram native inline math <tg-math>
      rawHtml = rawHtml.replace(/<tg-math>([\s\S]*?)<\/tg-math>/g, (_, math) => {
        try {
          return `<span class="tg-katex-inline">${katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })}</span>`;
        } catch {
          return math;
        }
      });
      // Display block math ($$...$$)
      rawHtml = rawHtml.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
        try {
          return `<div class="tg-katex-block">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch {
          return math;
        }
      });
      // Inline math ($...$)
      rawHtml = rawHtml.replace(/\$([^$\n]+)\$/g, (_, math) => {
        try {
          return `<span class="tg-katex-inline">${katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })}</span>`;
        } catch {
          return math;
        }
      });
    } catch (e) {
      console.error('KaTeX render error:', e);
    }

    rawHtml = rawHtml.replace(
      /<tg-emoji(?:\s[^>]*)?>(.*?)<\/tg-emoji>/g,
      '<span class="tg-preview-custom-emoji">$1</span>'
    );

    // 2. Interactive <tg-spoiler>
    let spoilerIndex = 0;
    rawHtml = rawHtml.replace(/<tg-spoiler>(.*?)<\/tg-spoiler>/g, (_, content) => {
      const idx = spoilerIndex++;
      const isRevealed = !!revealedSpoilers[idx];
      return `<span class="tg-preview-spoiler ${isRevealed ? 'revealed' : ''}" data-spoiler-idx="${idx}">${content}</span>`;
    });

    // 3a. Interactive details / "Show me more"
    const paintDetails = (idx: number, summary: string, body: string) => {
      const isExpanded = !!expandedDetails[idx];
      return (
        `<div class="tg-preview-details-block ${isExpanded ? 'is-open' : ''}" data-details-idx="${idx}">` +
        `<div class="tg-details-summary"><span class="tg-details-chevron"></span><span>${summary}</span></div>` +
        `<div class="tg-details-body">${body}</div>` +
        `</div>`
      );
    };
    rawHtml = rawHtml.replace(
      /<div class="tg-preview-details-block" data-details-idx="(\d+)">\s*<div class="tg-details-summary">([\s\S]*?)<\/div>\s*<div class="tg-details-body">([\s\S]*?)<\/div>\s*<\/div>/g,
      (_, idx, summary, body) => paintDetails(parseInt(idx, 10), summary, body)
    );
    rawHtml = rawHtml.replace(
      /<details(?:\s[^>]*)?>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g,
      (_, summary, body) => paintDetails(0, summary, body)
    );

    // 3. Interactive <blockquote expandable|collapsed>
    let quoteIndex = 0;
    rawHtml = rawHtml.replace(/<blockquote(\s+(?:expandable|collapsed))?>([\s\S]*?)<\/blockquote>/g, (match, isExp, content) => {
      if (!isExp) return match;
      const idx = quoteIndex++;
      const isExpanded = !!expandedQuotes[idx];
      return (
        `<div class="tg-preview-expandable-wrap ${isExpanded ? 'is-expanded' : ''}" data-expandable-idx="${idx}">` +
        `<blockquote class="tg-expandable-body ${isExpanded ? 'expanded' : 'collapsed'}">${content}</blockquote>` +
        `<div class="tg-expandable-toggle">` +
        `<span class="tg-expandable-chevron">${isExpanded ? '▲' : '▼'}</span>` +
        `<span class="tg-expandable-label">${isExpanded ? 'Collapse' : 'Expand quote'}</span>` +
        `</div>` +
        `</div>`
      );
    });

    // 4. Telegram-style Code Blocks with Language Header & Quick Copy
    rawHtml = rawHtml.replace(/<pre><code(?:\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang, codeContent) => {
      const displayLang = (lang || 'code').toUpperCase();
      const plainSnippet = codeContent.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const encoded = encodeURIComponent(plainSnippet);
      return (
        `<div class="tg-preview-codeblock-wrap">` +
        `<div class="tg-codeblock-header">` +
        `<span class="tg-codeblock-lang">${displayLang}</span>` +
        `<button type="button" class="tg-codeblock-copy-btn" data-code="${encoded}">Copy</button>` +
        `</div>` +
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${codeContent}</code></pre>` +
        `</div>`
      );
    });

    return (
      <div
        className="tg-bubble-html-content"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const copyBtn = target.closest('.tg-codeblock-copy-btn') as HTMLElement;
          if (copyBtn) {
            const codeToCopy = copyBtn.getAttribute('data-code');
            if (codeToCopy) {
              navigator.clipboard.writeText(decodeURIComponent(codeToCopy));
              copyBtn.textContent = 'Copied!';
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
              }, 1500);
            }
            return;
          }
          const spoilerEl = target.closest('.tg-preview-spoiler');
          if (spoilerEl) {
            const idxStr = spoilerEl.getAttribute('data-spoiler-idx');
            if (idxStr !== null) toggleSpoiler(parseInt(idxStr, 10));
            return;
          }
          const detailsEl = target.closest('.tg-preview-details-block') as HTMLElement | null;
          if (detailsEl) {
            const idxStr = detailsEl.getAttribute('data-details-idx');
            if (idxStr !== null) {
              const idx = parseInt(idxStr, 10);
              setExpandedDetails((prev) => ({ ...prev, [idx]: !prev[idx] }));
            }
            return;
          }
          const expEl = target.closest('.tg-expandable-toggle') || target.closest('.tg-preview-expandable-wrap');
          if (expEl) {
            const wrap = (expEl.classList.contains('tg-preview-expandable-wrap') ? expEl : expEl.closest('.tg-preview-expandable-wrap')) as HTMLElement | null;
            const idxStr = wrap?.getAttribute('data-expandable-idx');
            if (idxStr !== null && idxStr !== undefined) toggleExpandable(parseInt(idxStr, 10));
          }
        }}
      />
    );
  };

  const mediaList = serialized.media || [];
  const buttonRows = serialized.buttons || [];

  return (
    <div className="telegram-preview-container">
      {/* Top Header / Channel Bar */}
      <div className="tg-preview-header">
        <div className="tg-channel-profile">
          <div className="tg-channel-avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt={channelName} />
            ) : (
              <span>{channelName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="tg-channel-info">
            <span className="tg-channel-title">{channelName}</span>
            <span className="tg-channel-meta">Channel • Live Preview</span>
          </div>
        </div>

        {/* Unified Segmented Export Capsule */}
        <div className="tg-export-segmented-bar" role="group" aria-label="Copy post format">
          <button
            type="button"
            className={`tg-export-segment ${copiedFormat === 'html' ? 'copied' : ''}`}
            onClick={() => handleCopy('html')}
            title="Copy Telegram HTML"
          >
            {copiedFormat === 'html' ? <Check size={11} /> : <Code2 size={11} />}
            <span>HTML</span>
          </button>
          <button
            type="button"
            className={`tg-export-segment ${copiedFormat === 'markdown' ? 'copied' : ''}`}
            onClick={() => handleCopy('markdown')}
            title="Copy Telegram MarkdownV2"
          >
            {copiedFormat === 'markdown' ? <Check size={11} /> : <FileText size={11} />}
            <span>MD</span>
          </button>
          <button
            type="button"
            className={`tg-export-segment ${copiedFormat === 'text' ? 'copied' : ''}`}
            onClick={() => handleCopy('text')}
            title="Copy Plain Text"
          >
            {copiedFormat === 'text' ? <Check size={11} /> : <Copy size={11} />}
            <span>Text</span>
          </button>
          <button
            type="button"
            className={`tg-export-segment tg-segment-json ${copiedFormat === 'json' ? 'copied' : ''}`}
            onClick={() => handleCopy('json')}
            title="Copy Telegram Bot API InputRichMessage (JSON)"
          >
            {copiedFormat === 'json' ? <Check size={11} /> : <Sparkles size={11} />}
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Telegram Chat Wallpaper Canvas */}
      <div className="tg-canvas-pattern">
        <div className="tg-message-row">
          {/* Authentic Telegram Post Bubble */}
          <div className="tg-post-bubble">
            {/* Attached Media Cards (Photo/Video Collage) */}
            {mediaList.length > 0 && (
              <div className={`tg-bubble-media-collage count-${Math.min(mediaList.length, 4)}`}>
                {mediaList.map((m, mIdx) => {
                  const hasSpoiler = !!m.isSpoiler;
                  const isRevealed = !!revealedMediaSpoilers[mIdx];
                  return (
                    <div key={m.id || mIdx} className="tg-media-collage-item tg-preview-media-item">
                      {hasSpoiler && !isRevealed && (
                        <div
                          className="tg-preview-media-spoiler-cover"
                          onClick={() => {
                            try {
                              (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
                            } catch {}
                            setRevealedMediaSpoilers((prev) => ({ ...prev, [mIdx]: true }));
                          }}
                          title="Click to reveal"
                        >
                          <div className="tg-media-spoiler-badge">
                            <EyeOff size={14} />
                            <span>Photo Spoiler</span>
                          </div>
                        </div>
                      )}
                      {m.type === 'photo' && (
                        <img src={m.previewUrl || m.url} alt="Attached" className="tg-media-img" />
                      )}
                      {m.type === 'video' && (
                        <div className="tg-media-video-wrap">
                          <video src={m.previewUrl || m.url} className="tg-media-video" controls />
                        </div>
                      )}
                      {m.type === 'audio' && (
                        <div className="tg-media-audio-card">
                          <div className="tg-audio-play-btn"><Play size={16} /></div>
                          <div className="tg-audio-info">
                            <span className="tg-audio-title">
                              {m.fileName || `Audio Attachment #${mIdx + 1}`}
                            </span>
                            <span className="tg-audio-url">{m.fileId ? 'Uploaded file' : m.url}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="tg-bubble-body">
              {renderInteractiveHTML()}
            </div>

            {/* Bubble Footer with views and time */}
            <div className="tg-bubble-footer">
              <span className="tg-footer-views">
                <Eye size={12} />
                <span>1.4K</span>
              </span>
              <span className="tg-footer-time">{currentTime}</span>
            </div>
          </div>

          {/* Attached Telegram Inline Buttons */}
          {buttonRows.length > 0 && (
            <div className="tg-post-inline-keyboard">
              {buttonRows.map((row, rIdx) => (
                <div key={rIdx} className="tg-inline-keyboard-row">
                  {row.map((btn) => (
                    <a
                      key={btn.id}
                      href={btn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tg-inline-btn"
                    >
                      <span>{btn.text}</span>
                      <ExternalLink size={12} className="tg-inline-btn-icon" />
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats and Info Strip */}
      <div className="tg-preview-bottom-stats">
        <div className="tg-stats-col">
          <span className="tg-stat-label">Characters:</span>
          <span className="tg-stat-val">{serialized.characterCount} / 32768</span>
        </div>
        <div className="tg-stats-col">
          <span className="tg-stat-label">Media:</span>
          <span className="tg-stat-val">{mediaList.length} items</span>
        </div>
        <div className="tg-stats-col">
          <span className="tg-stat-label">Buttons:</span>
          <span className="tg-stat-val">{buttonRows.flat().length} active</span>
        </div>
        <div className="tg-stats-col">
          <span className="tg-stat-label">Mode:</span>
          <span className="tg-stat-val" style={{ color: '#64b5f6' }}>Rich Messages</span>
        </div>
      </div>
    </div>
  );
};
