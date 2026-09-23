import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  Check,
  MoreHorizontal,
  Trash2,
  Copy,
  Code2,
  FileText,
  X,
} from 'lucide-react';

import { SpoilerExtension } from './editor/extensions/SpoilerExtension';
import { CustomEmojiExtension } from './editor/extensions/CustomEmojiExtension';
import { TelegramBlockquote } from './editor/extensions/TelegramBlockquote';
import { CodeBlockDoubleReturn } from './editor/extensions/CodeBlockDoubleReturn';
import { SubscriptExtension } from './editor/extensions/SubscriptExtension';
import { SuperscriptExtension } from './editor/extensions/SuperscriptExtension';
import { PullQuoteExtension } from './editor/extensions/PullQuoteExtension';
import { DetailsExtension } from './editor/extensions/DetailsExtension';
import { MathBlockExtension } from './editor/extensions/MathExtension';
import { MapExtension } from './editor/extensions/MapExtension';
import { ReferenceMarkExtension, ReferenceBlockExtension } from './editor/extensions/ReferenceExtension';
import { serializeTelegramDoc } from './editor/serialization/telegramSerializers';
import { sanitizePastedHTML } from './utils/sanitize';
import { EditorToolbar } from './components/EditorToolbar';
import { FloatingBubbleMenu } from './components/FloatingBubbleMenu';
import { TelegramPreview } from './components/TelegramPreview';
import { TableFloatingToolbar } from './components/TableFloatingToolbar';
import { MentionDateModal } from './components/MentionDateModal';
import { LinkModal } from './components/LinkModal';
import { PersistenceState, SerializedTelegramPost } from './types/editor';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Send, Megaphone, Loader2 } from 'lucide-react';
import { getUserData } from '../../../utils/telegram';
import {
  LinkedChannel,
  fetchLinkedChannels,
  publishPostAPI,
} from '../../../utils/channelStorage';
import { fetchPendingYouTubePost } from '../../../utils/youtubeAPI';
import { ChannelSelectorModal } from './components/ChannelSelectorModal';
import { MediaModal } from './components/MediaModal';
import { PostMedia, PostInlineButton } from './types/editor';
import {
  TELEGRAM_SHOWCASE_HTML,
  TELEGRAM_SHOWCASE_MEDIA,
  TELEGRAM_SHOWCASE_BUTTONS,
} from './utils/showcaseDocument';
import { Sparkles } from 'lucide-react';
import { OverlayPortal } from './components/OverlayPortal';
import './TelegramPostEditor.css';

interface TelegramPostEditorProps {
  onBack: () => void;
  accentColor?: string;
}

const STORAGE_KEY = 'remigram_studio_telegram_post_draft';
const EMPTY_POST_HTML = '<p></p>';

const INITIAL_CONTENT = `
<h1>🚀 Telegram Rich Composer</h1>
<p>Create next-generation, professionally formatted Telegram posts with full <b>Telegram Rich Messages</b> support:</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><input type="checkbox" checked/><div><b>Bold</b>, <i>Italic</i>, <u>Underline</u>, and <s>Strikethrough</s></div></li>
  <li data-type="taskItem" data-checked="true"><input type="checkbox" checked/><div><tg-spoiler>Secret spoiler text!</tg-spoiler> 🤫</div></li>
  <li data-type="taskItem" data-checked="false"><input type="checkbox"/><div>Interactive task checklists with checkboxes</div></li>
  <li data-type="taskItem" data-checked="false"><input type="checkbox"/><div>Native Telegram tables and headers</div></li>
</ul>
<blockquote>💡 Clean blockquotes with Telegram's signature accent bar</blockquote>
<blockquote expandable><p><b>⚡ Expandable Blockquote:</b> Tap to read more about Telegram 7.3+ collapsible quotes! They keep long posts neat and readable on mobile devices.</p></blockquote>
<table bordered>
  <tr>
    <th>Feature</th>
    <th>Standard</th>
    <th>Rich Messages</th>
  </tr>
  <tr>
    <td>Char limit</td>
    <td>4,096</td>
    <td>32,768</td>
  </tr>
  <tr>
    <td>Tables</td>
    <td>❌</td>
    <td>✅ Native</td>
  </tr>
  <tr>
    <td>Checklists</td>
    <td>❌</td>
    <td>✅ Native</td>
  </tr>
</table>
<pre><code class="language-python"># Native code blocks with syntax styling
def send_telegram_rich_post():
    print("Post published natively via Bot API 10.1+!")</code></pre>
<p>Tap <b>👁 Preview</b> in the top-right corner to see how this appears in Telegram! 📲</p>
`;

export const TelegramPostEditor: React.FC<TelegramPostEditorProps> = ({
  onBack,
  accentColor = 'lime',
}) => {
  // UI & Persistence States
  const [persistence, setPersistence] = useState<PersistenceState>('saved');
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false));
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState<boolean>(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [isMentionModalOpen, setIsMentionModalOpen] = useState<boolean>(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState<string>('');
  const [linkSelectedText, setLinkSelectedText] = useState<string>('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInsertMention = (text: string, link: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`<a href="${link}">${text}</a> `).run();
  };

  const handleInsertTimestamp = (text: string, timestampUrl: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`<a href="${timestampUrl}">${text}</a> `).run();
  };

  // Channels & Publishing States
  const [channels, setChannels] = useState<LinkedChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<LinkedChannel | null>(null);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Attached Media & Inline Buttons States
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [buttons, setButtons] = useState<PostInlineButton[][]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);

  const currentUser = getUserData();
  const userId = currentUser?.id || 12345678;

  // Load user linked channels
  useEffect(() => {
    if (userId) {
      fetchLinkedChannels(userId).then((list) => {
        setChannels(list);
        // Automatically select first channel if available
        if (list.length > 0) {
          setSelectedChannel(list[0]);
        }
      });
    }
  }, [userId]);


  // Telegram WebApp Native BackButton integration
  useEffect(() => {
    const webApp = (window as any)?.Telegram?.WebApp;
    if (webApp?.BackButton) {
      try {
        webApp.BackButton.show();
        const handleNativeBack = () => {
          onBack();
        };
        webApp.BackButton.onClick(handleNativeBack);
        return () => {
          try {
            webApp.BackButton.offClick(handleNativeBack);
            webApp.BackButton.hide();
          } catch {}
        };
      } catch {}
    }
  }, [onBack]);

  const [serialized, setSerialized] = useState<SerializedTelegramPost>({
    plainText: '',
    html: '',
    markdownV2: '',
    entities: [],
    characterCount: 0,
    wordCount: 0,
    media: [],
    buttons: [],
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync media and buttons into serialized
  useEffect(() => {
    setSerialized((prev) => ({
      ...prev,
      media,
      buttons,
    }));
  }, [media, buttons]);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: 'tiptap-code-block',
          },
        },
        blockquote: false,
        bulletList: {
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
          },
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'tiptap-heading',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      SpoilerExtension,
      CustomEmojiExtension,
      TelegramBlockquote,
      CodeBlockDoubleReturn,
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'tg-table-node',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({
        HTMLAttributes: {
          class: 'tg-task-list-node',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'tg-task-item-node',
        },
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: 'tg-highlight-mark',
        },
      }),
      SubscriptExtension,
      SuperscriptExtension,
      PullQuoteExtension,
      DetailsExtension,
      MathBlockExtension,
      MapExtension,
      ReferenceMarkExtension,
      ReferenceBlockExtension,
    ],
    content: (() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || INITIAL_CONTENT;
    })(),
    editorProps: {
      attributes: {
        class: 'telegram-prose-editor focus:outline-none',
        spellcheck: 'false',
      },
      transformPastedHTML(html) {
        return sanitizePastedHTML(html);
      },
    },
    onUpdate: ({ editor: ed }) => {
      // 1. Serialize document immediately for real-time preview
      const docJSON = ed.getJSON();
      const ser = serializeTelegramDoc(docJSON, media, buttons);
      setSerialized(ser);

      // 2. Debounced persistence
      setPersistence('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, ed.getHTML());
          setPersistence('saved');
        } catch (e) {
          setPersistence('error');
        }
      }, 800);
    },
    onCreate: ({ editor: ed }) => {
      const docJSON = ed.getJSON();
      setSerialized(serializeTelegramDoc(docJSON, media, buttons));
    },
  });

  // Pre-load pending YouTube video post if requested via URL param (yt_pending_id)
  useEffect(() => {
    if (!editor) return;
    const p = new URLSearchParams(window.location.search);
    const ytPendingId = p.get('yt_pending_id');
    if (ytPendingId) {
      fetchPendingYouTubePost(ytPendingId)
        .then((pending) => {
          if (pending) {
            editor.commands.setContent(pending.formatted_html);
            if (pending.thumbnail_url) {
              setMedia([
                {
                  id: `yt_thumb_${Date.now()}`,
                  type: 'photo',
                  url: pending.thumbnail_url,
                  isSpoiler: false,
                },
              ]);
            }
            if (pending.video_url) {
              setButtons([
                [
                  {
                    id: `yt_btn_${Date.now()}`,
                    text: '🍿 Watch on YouTube',
                    type: 'url',
                    url: pending.video_url,
                  },
                ],
              ]);
            }
            if (pending.target_channel_id && channels.length > 0) {
              const found = channels.find((c) => c.id === pending.target_channel_id);
              if (found) setSelectedChannel(found);
            }
          }
        })
        .catch((err) => console.error('Error preloading YouTube post:', err));
    }
  }, [editor, channels]);

  // Handle Link Modal
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    setLinkInitialUrl(previousUrl);
    setLinkSelectedText(selectedText);
    setIsLinkModalOpen(true);
  };

  const handleApplyLink = (url: string) => {
    if (!editor) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  const openClearConfirm = () => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    setIsMoreMenuOpen(false);
    setIsClearConfirmOpen(true);
  };

  const confirmClearPost = () => {
    if (!editor) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    editor.chain().focus().setContent(EMPTY_POST_HTML).run();
    setMedia([]);
    setButtons([]);
    try {
      localStorage.setItem(STORAGE_KEY, EMPTY_POST_HTML);
    } catch {}
    setPersistence('saved');
    setIsClearConfirmOpen(false);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning');
    } catch {}
  };

  // Load 21-Item Telegram Showcase
  const handleLoadShowcase = () => {
    if (!editor) return;
    editor.chain().focus().setContent(TELEGRAM_SHOWCASE_HTML).run();
    setMedia(TELEGRAM_SHOWCASE_MEDIA);
    setButtons(TELEGRAM_SHOWCASE_BUTTONS);
    try {
      localStorage.setItem(STORAGE_KEY, TELEGRAM_SHOWCASE_HTML);
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
    setIsMoreMenuOpen(false);
  };

  // Copy Format Helper
  const handleCopy = (format: 'html' | 'markdown' | 'text' | 'json') => {
    let textToCopy = '';
    if (format === 'html') textToCopy = serialized.html;
    else if (format === 'markdown') textToCopy = serialized.markdownV2;
    else if (format === 'json') textToCopy = JSON.stringify(serialized.richMessage || serialized.document, null, 2);
    else textToCopy = serialized.plainText;

    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
    setIsMoreMenuOpen(false);
  };

  // Publish Post to Target Channel/Group
  const handlePublishPost = async () => {
    if (!selectedChannel) {
      setIsChannelModalOpen(true);
      return;
    }

    if (!serialized.html || !serialized.html.trim()) {
      alert('Cannot publish empty post.');
      return;
    }

    if (!confirm(`Publish this post to "${selectedChannel.title}" now?`)) {
      return;
    }

    setIsPublishing(true);
    setPublishStatus(null);

    try {
      const res = await publishPostAPI({
        userId,
        channelId: selectedChannel.id,
        htmlContent: serialized.html,
        fallbackHtml: serialized.fallbackHtml,
        media,
        buttons,
      });

      if (res.ok) {
        setPublishStatus({ type: 'success', text: `Published to ${selectedChannel.title}!` });
        try {
          (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        } catch {}
      } else {
        setPublishStatus({ type: 'error', text: res.error || 'Failed to publish post' });
        try {
          (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
        } catch {}
      }
    } catch (err: any) {
      setPublishStatus({ type: 'error', text: err.message || 'Error occurred' });
    } finally {
      setIsPublishing(false);
      setTimeout(() => setPublishStatus(null), 4000);
    }
  };

  return (
    <div
      className="telegram-post-editor-page docs-style-page"
      data-no-swipe="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Frosted top safe-area guard for smooth scrolling under status bar */}
      <div className="editor-top-safe-guard" aria-hidden="true" />

      {/* ── Streamlined Top Header ── */}
      <div className="editor-top-nav docs-header">
        <div className="top-nav-left">
          <button
            type="button"
            className="editor-back-btn-icon"
            onClick={onBack}
            aria-label="Back to Studio"
          >
            <ArrowLeft size={19} />
          </button>

          {/* Channel Selector Button */}
          <button
            type="button"
            className={`editor-channel-picker-btn ${selectedChannel ? 'has-channel' : ''}`}
            onClick={() => {
              try {
                (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
              } catch {}
              setIsChannelModalOpen(true);
            }}
            title={selectedChannel ? `Posting to ${selectedChannel.title}` : 'Link or select Telegram channel'}
          >
            <Megaphone size={14} />
            <span className="channel-picker-label">
              {selectedChannel ? selectedChannel.title : 'Link Channel'}
            </span>
          </button>

          <div
            className="editor-draft-status"
            title={persistence === 'saving' ? 'Saving draft...' : 'Draft saved to local storage'}
          >
            {persistence === 'saving' ? (
              <span className="draft-status-saving">
                <Loader2 size={12} className="animate-spin" />
                <span className="draft-status-text hidden-mobile">Saving...</span>
              </span>
            ) : (
              <span className="draft-status-saved">
                <Check size={12} />
                <span className="draft-status-text hidden-mobile">Saved</span>
              </span>
            )}
          </div>
        </div>

        <div className="top-nav-right">

          {/* Publish Post Button */}
          <button
            type="button"
            className="editor-publish-btn"
            onClick={handlePublishPost}
            disabled={isPublishing}
            title="Publish post to channel"
            aria-label="Publish post"
          >
            {isPublishing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Send size={14} />
                <span className="nav-action-label">Publish</span>
              </>
            )}
          </button>

          {/* Preview Button */}
          <button
            type="button"
            className="mobile-preview-toggle-btn"
            onClick={() => {
              try {
                (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('medium');
              } catch {}
              setIsMobilePreviewOpen(true);
            }}
            aria-label={serialized.characterCount > 0 ? `Preview post, ${serialized.characterCount} characters` : 'Preview post'}
            title={serialized.characterCount > 0 ? `Preview Telegram post (${serialized.characterCount})` : 'Preview Telegram post'}
          >
            <Eye size={15} />
            <span className="nav-action-label">Preview</span>
            {serialized.characterCount > 0 && (
              <span className={`mobile-preview-count ${serialized.characterCount > 32768 ? 'over-limit' : ''}`}>
                {serialized.characterCount}
              </span>
            )}
          </button>

          {/* Clear Post Button */}
          <button
            type="button"
            className="editor-clear-btn-icon"
            onClick={openClearConfirm}
            title="Clear post"
            aria-label="Clear post"
          >
            <Trash2 size={16} />
            <span className="nav-action-label mobile-only">Clear</span>
          </button>

          {/* More Menu (3 dots) */}
          <div className="docs-more-menu-container">
            <button
              type="button"
              className="editor-more-btn-icon"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              aria-label="More actions"
            >
              <MoreHorizontal size={18} />
              <span className="nav-action-label mobile-only">More</span>
            </button>

            {isMoreMenuOpen && (
              <OverlayPortal>
                <div className="docs-menu-backdrop" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="docs-popover-menu animate-fade-in">
                  <div className="docs-popover-label">Telegram Rich Messages</div>
                  <button type="button" className="docs-popover-item showcase-item" onClick={handleLoadShowcase}>
                    <Sparkles size={15} style={{ color: '#00d2ff' }} />
                    <span style={{ fontWeight: 600, color: '#00d2ff' }}>Load 21-Item Showcase</span>
                  </button>
                  <button type="button" className="docs-popover-item" onClick={() => handleCopy('json')}>
                    <Code2 size={15} />
                    <span>Copy InputRichMessage (JSON)</span>
                  </button>
                  <div className="docs-popover-divider" />
                  <div className="docs-popover-label">Standard Formats</div>
                  <button type="button" className="docs-popover-item" onClick={() => handleCopy('html')}>
                    <Code2 size={15} />
                    <span>Copy Telegram HTML</span>
                  </button>
                  <button type="button" className="docs-popover-item" onClick={() => handleCopy('markdown')}>
                    <FileText size={15} />
                    <span>Copy MarkdownV2</span>
                  </button>
                  <button type="button" className="docs-popover-item" onClick={() => handleCopy('text')}>
                    <Copy size={15} />
                    <span>Copy Plain Text</span>
                  </button>
                  <div className="docs-popover-divider" />
                  <button type="button" className="docs-popover-item danger" onClick={openClearConfirm}>
                    <Trash2 size={15} />
                    <span>Clear Post</span>
                  </button>
                </div>
              </OverlayPortal>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Formatting Toolbar Island (always visible at top) ── */}
      <div
        className="editor-sticky-toolbar-island"
        data-no-swipe="true"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <EditorToolbar
          editor={editor}
          onOpenLinkModal={handleOpenLinkModal}
          onOpenMediaModal={() => setIsMediaModalOpen(true)}
          onOpenMentionModal={() => setIsMentionModalOpen(true)}
          characterCount={serialized.characterCount}
          wordCount={serialized.wordCount}
          isMobile={isMobile}
          mediaCount={media.length}
          buttonsCount={buttons.flat().length}
        />
      </div>

      {/* ── Main Workspace ── */}
      <div className={`editor-workspace-layout ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
        {/* Document Sheet */}
        <div className="editor-main-card docs-document-sheet">
          {/* Floating Bubble Menu for highlighted selections on Desktop */}
          {!isMobile && (
            <FloatingBubbleMenu
              editor={editor}
              onOpenLinkModal={handleOpenLinkModal}
              onOpenMentionModal={() => setIsMentionModalOpen(true)}
            />
          )}

          {/* Floating Table Toolbar for active table editing */}
          <TableFloatingToolbar editor={editor} />

          {/* Document Content Canvas */}
          <div className="editor-scrollable-area docs-page-canvas">
            <EditorContent editor={editor} className="tiptap-content-wrapper" />
          </div>
        </div>

        {/* Right: Telegram Live Preview (Desktop Side-by-Side) */}
        {!isMobile && (
          <div className="editor-preview-card">
            <TelegramPreview serialized={serialized} />
          </div>
        )}
      </div>

      {/* ── Mobile Preview Sheet Modal ── */}
      <OverlayPortal>
        <AnimatePresence>
          {isMobile && isMobilePreviewOpen && (
            <div className="mobile-preview-sheet-backdrop" onClick={() => setIsMobilePreviewOpen(false)}>
              <motion.div
                className="mobile-preview-sheet-content"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <div className="sheet-drag-handle" />

                <div className="sheet-header">
                  <div className="sheet-title-col">
                    <span className="sheet-title">Telegram Post Preview</span>
                    <span className="sheet-subtitle">Real message appearance in Telegram</span>
                  </div>
                  <button
                    type="button"
                    className="sheet-close-btn"
                    onClick={() => setIsMobilePreviewOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="sheet-body">
                  <TelegramPreview serialized={serialized} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </OverlayPortal>

      {/* ── Link & Inline Buttons Popover / Modal ── */}
      <LinkModal
        isOpen={isLinkModalOpen}
        initialUrl={linkInitialUrl}
        selectedText={linkSelectedText}
        onApply={handleApplyLink}
        onRemove={handleRemoveLink}
        onClose={() => setIsLinkModalOpen(false)}
        buttons={buttons}
        onUpdateButtons={(b) => setButtons(b)}
      />

      {/* ── Telegram Mention & Timestamp Modal ── */}
      <MentionDateModal
        isOpen={isMentionModalOpen}
        onClose={() => setIsMentionModalOpen(false)}
        onInsertMention={handleInsertMention}
        onInsertTimestamp={handleInsertTimestamp}
      />

      {/* ── Channel & Group Destination Modal ── */}
      <ChannelSelectorModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        userId={userId}
        channels={channels}
        selectedChannelId={selectedChannel?.id || null}
        onSelectChannel={(ch) => setSelectedChannel(ch)}
        onChannelsUpdated={(updated) => setChannels(updated)}
      />

      {/* ── Dedicated Media Attachment Modal (Photo, Video, Audio) ── */}
      <MediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        media={media}
        onUpdateMedia={(m) => setMedia(m)}
      />

      {isClearConfirmOpen && (
        <OverlayPortal>
          <div
            className="channel-modal-backdrop clear-confirm-backdrop"
            onClick={() => setIsClearConfirmOpen(false)}
          >
            <div
              className="channel-modal-content clear-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-post-title"
            >
              <div className="channel-modal-header">
                <div className="channel-modal-title-row">
                  <div className="channel-modal-icon-badge clear-confirm-icon-badge">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 id="clear-post-title" className="channel-modal-title">Clear this post?</h3>
                    <p className="channel-modal-sub">The saved draft, media, and buttons will be deleted. This cannot be undone.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="channel-modal-close-btn"
                  onClick={() => setIsClearConfirmOpen(false)}
                  aria-label="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="clear-confirm-actions">
                <button
                  type="button"
                  className="link-btn-cancel"
                  onClick={() => setIsClearConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="clear-confirm-danger-btn"
                  onClick={confirmClearPost}
                >
                  <Trash2 size={14} />
                  <span>Clear post</span>
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* ── Publish Toast Notification ── */}
      <AnimatePresence>
        {publishStatus && (
          <motion.div
            className={`editor-publish-toast ${publishStatus.type}`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <span>{publishStatus.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
