import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  EyeOff,
  Undo2,
  Redo2,
  Plus,
  X,
  Link as LinkIcon,
  List,
  ListOrdered,
  CheckSquare,
  Highlighter,
  Code,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AtSign,
  Eraser,
  Rows3,
  Columns3,
  Quote,
  Table as TableIcon,
  FileCode,
  Image as ImageIcon,
  Smile,
  ChevronsDownUp,
  Sparkles,
  Sigma,
  MapPin,
  Bookmark,
  Minus,
  Type,
  LayoutGrid,
  Paperclip,
  Settings2,
} from 'lucide-react';
import { HeadingDropdown } from './HeadingDropdown';
import { EmojiPickerDropdown } from './EmojiPickerDropdown';

const CODE_LANGUAGES = [
  { value: '', label: 'Plain' },
  { value: 'javascript', label: 'JS' },
  { value: 'typescript', label: 'TS' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
];

interface EditorToolbarProps {
  editor: Editor | null;
  onOpenLinkModal: () => void;
  onOpenMediaModal?: () => void;
  onOpenMentionModal?: () => void;
  characterCount: number;
  wordCount: number;
  isMobile?: boolean;
  mediaCount?: number;
  buttonsCount?: number;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onOpenLinkModal,
  onOpenMediaModal,
  onOpenMentionModal,
  characterCount,
  wordCount,
  isMobile = false,
  mediaCount = 0,
  buttonsCount = 0,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);

  if (!editor) return null;

  const handleAction = (e: React.MouseEvent | React.TouchEvent, callback: () => void) => {
    e.preventDefault();
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    callback();
  };

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isStrike = editor.isActive('strike');
  const isHighlight = editor.isActive('highlight');
  const isSpoiler = editor.isActive('spoiler');
  const isLink = editor.isActive('link');
  const isSubscript = editor.isActive('subscript');
  const isSuperscript = editor.isActive('superscript');
  const isCode = editor.isActive('code');
  const isCodeBlock = editor.isActive('codeBlock');
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');
  const isTaskList = editor.isActive('taskList');
  const isTable = editor.isActive('table');
  const isBlockquote = editor.isActive('blockquote');
  const isDetailsBlock = editor.isActive('detailsBlock');
  const isPullQuote = editor.isActive('pullQuote');

  const currentCodeLang = editor.getAttributes('codeBlock').language || '';

  const maxChars = 32768; // Telegram Bot API 10.1+ Rich Messages limit
  const isNearLimit = characterCount > maxChars * 0.9;
  const isOverLimit = characterCount > maxChars;

  // Structural Insert Actions
  const paragraph = (text: string) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });

  const isSelectionEmpty = () => editor.state.selection.empty;

  const handleToggleExpandable = () => {
    if (isDetailsBlock) {
      editor.chain().focus().toggleDetails().run();
      return;
    }
    if (!isSelectionEmpty()) {
      editor.chain().focus().setDetails({ title: 'Show me more' }).run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'detailsBlock',
        attrs: { title: 'Show me more' },
        content: [
          paragraph('Show me more'),
          paragraph(
            "Oh, you actually opened this section. I guess I should've thought of something clever to put here but I didn't think you'd actually do it."
          ),
        ],
      })
      .run();
  };

  const handleInsertPullQuote = () => {
    if (isPullQuote) {
      editor.chain().focus().unsetPullQuote().run();
      return;
    }
    if (!isSelectionEmpty()) {
      editor.chain().focus().wrapIn('pullQuote', { author: 'Author name' }).run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'pullQuote',
        attrs: { author: 'Author name' },
        content: [
          paragraph('Pull quote text highlighting a key insight.'),
          paragraph('Author name'),
        ],
      })
      .run();
  };

  const handleInsertMath = () => {
    editor
      .chain()
      .focus()
      .insertMathBlock({ formula: '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}' })
      .run();
  };

  const handleInsertMap = () => {
    editor
      .chain()
      .focus()
      .insertContent('<div data-type="tg-map" data-lat="37.7749" data-lng="-122.4194" data-title="Event Location" data-address="San Francisco, CA"></div><p></p>')
      .run();
  };

  const handleInsertReference = () => {
    let markCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.marks?.some((mark) => mark.type.name === 'referenceMark')) markCount += 1;
    });
    const nextId = String(markCount + 1);
    const selected = editor.state.doc
      .textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
      .trim();

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: selected || 'What about footnotes' },
            {
              type: 'text',
              text: nextId,
              marks: [{ type: 'referenceMark', attrs: { refId: nextId } }],
            },
            { type: 'text', text: '.' },
          ],
        },
        {
          type: 'referenceBlock',
          attrs: {
            id: nextId,
            label: nextId,
            text: 'Brought to you by Telegram Team',
          },
        },
      ])
      .run();
  };

  const handleInsertTable = () => {
    if (isTable) {
      editor.chain().focus().deleteTable().run();
    } else {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const handleInsertDivider = () => {
    editor.chain().focus().setHorizontalRule().insertContent({ type: 'paragraph' }).run();
  };

  return (
    <div
      className={`docs-formatting-toolbar ${isMobile ? 'mobile-island-mode' : 'desktop-island-mode'} ${isMobile && isMobileExpanded ? 'is-expanded' : ''}`}
      data-no-swipe="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* ══════════════════════════════════════════════════════════════
          DESKTOP MODE: Full Island Ribbon with Visible Departments
          ══════════════════════════════════════════════════════════════ */}
      {!isMobile ? (
        <div className="desktop-toolbar-ribbon">
          {/* Compartment 1: History */}
          <div className="toolbar-compartment" title="History">
            <button
              type="button"
              className="toolbar-btn"
              disabled={!canUndo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().undo().run())}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              disabled={!canRedo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().redo().run())}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>
          </div>

          <div className="toolbar-v-divider" />

          {/* Compartment 2: Text Styling */}
          <div className="toolbar-compartment" title="Text Styles">
            <HeadingDropdown editor={editor} />

            <button
              type="button"
              className={`toolbar-btn ${isBold ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBold().run())}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
            >
              <Bold size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isItalic ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleItalic().run())}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
            >
              <Italic size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isUnderline ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleUnderline().run())}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
            >
              <UnderlineIcon size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isStrike ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleStrike().run())}
              title="Strikethrough"
              aria-label="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn tg-spoiler-btn ${isSpoiler ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSpoiler())}
              title="Telegram Spoiler (Ctrl+Shift+P)"
              aria-label="Telegram Spoiler"
            >
              <EyeOff size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isHighlight ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHighlight().run())}
              title="Highlight"
              aria-label="Highlight"
            >
              <Highlighter size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isCode ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleCode().run())}
              title="Inline Monospace Code"
              aria-label="Inline Code"
            >
              <Code size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isSubscript ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSubscript?.())}
              title="Subscript (X₂)"
              aria-label="Subscript"
            >
              <SubscriptIcon size={14} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isSuperscript ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSuperscript?.())}
              title="Superscript (X²)"
              aria-label="Superscript"
            >
              <SuperscriptIcon size={14} />
            </button>
          </div>

          <div className="toolbar-v-divider" />

          {/* Compartment 3: Lists & Structure */}
          <div className="toolbar-compartment" title="Lists & Structure">
            <button
              type="button"
              className={`toolbar-btn ${isBulletList ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBulletList().run())}
              title="Bullet List"
              aria-label="Bullet List"
            >
              <List size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isOrderedList ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleOrderedList().run())}
              title="Numbered List"
              aria-label="Numbered List"
            >
              <ListOrdered size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isTaskList ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleTaskList().run())}
              title="Task Checklist"
              aria-label="Task Checklist"
            >
              <CheckSquare size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isBlockquote ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBlockquote().run())}
              title="Telegram Blockquote"
              aria-label="Blockquote"
            >
              <Quote size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isDetailsBlock ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleToggleExpandable)}
              title="Expandable Quote (Collapsible)"
              aria-label="Expandable Quote"
            >
              <ChevronsDownUp size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isPullQuote ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertPullQuote)}
              title="Editorial Pull Quote"
              aria-label="Pull Quote"
            >
              <Sparkles size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isTable ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertTable)}
              title={isTable ? 'Delete Table' : 'Insert Table (3×3)'}
              aria-label="Table"
            >
              <TableIcon size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isCodeBlock ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().toggleCodeBlock().run())}
              title="Preformatted Code Block"
              aria-label="Code Block"
            >
              <FileCode size={15} />
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertDivider)}
              title="Horizontal Divider"
              aria-label="Divider"
            >
              <Minus size={15} />
            </button>
          </div>

          <div className="toolbar-v-divider" />

          {/* Compartment 4: Media, Links & Advanced Embeds */}
          <div className="toolbar-compartment" title="Media & Embeds">
            {onOpenMediaModal && (
              <button
                type="button"
                className={`toolbar-btn ${mediaCount > 0 ? 'has-attachments' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleAction(e, onOpenMediaModal)}
                title="Attach Media (Photo, Video, Audio)"
                aria-label="Attach Media"
              >
                <ImageIcon size={15} />
                {mediaCount > 0 && <span className="toolbar-badge-count">{mediaCount}</span>}
              </button>
            )}

            <button
              ref={emojiBtnRef}
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setIsEmojiPickerOpen((v) => !v);
              }}
              title="Telegram Custom Emoji"
              aria-label="Custom Emoji"
            >
              <Smile size={15} />
            </button>

            <button
              type="button"
              className={`toolbar-btn ${isLink || buttonsCount > 0 ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, onOpenLinkModal)}
              title="Hyperlink & Inline Buttons"
              aria-label="Hyperlink & Buttons"
            >
              <LinkIcon size={15} />
              {buttonsCount > 0 && <span className="toolbar-badge-count">{buttonsCount}</span>}
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertMath)}
              title="LaTeX Math Formula"
              aria-label="LaTeX Math"
            >
              <Sigma size={15} />
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertMap)}
              title="Location Pin (Map)"
              aria-label="Location Map"
            >
              <MapPin size={15} />
            </button>

            <button
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, handleInsertReference)}
              title="Footnote Reference"
              aria-label="Footnote"
            >
              <Bookmark size={15} />
            </button>

            {onOpenMentionModal && (
              <button
                type="button"
                className="toolbar-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleAction(e, onOpenMentionModal)}
                title="Mention / Timestamp Date"
                aria-label="Mention or Date"
              >
                <AtSign size={15} />
              </button>
            )}
          </div>

          <div className="toolbar-v-divider" />

          {/* Compartment 5: Utilities */}
          <div className="toolbar-compartment" title="Utilities">
            <button
              type="button"
              className="toolbar-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleAction(e, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
              title="Clear Formatting"
              aria-label="Clear Formatting"
            >
              <Eraser size={15} />
            </button>
          </div>

          {/* Contextual Table/Code options */}
          {isCodeBlock && (
            <div className="toolbar-compartment is-contextual">
              <span className="contextual-label">Lang:</span>
              <select
                className="toolbar-code-lang-select"
                value={currentCodeLang}
                onChange={(e) => {
                  editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value || null }).run();
                }}
                title="Code Language"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTable && (
            <div className="toolbar-compartment is-contextual">
              <button
                type="button"
                className="toolbar-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleAction(e, () => editor.chain().focus().addRowAfter().run())}
                title="Add Row Below"
              >
                <Rows3 size={15} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleAction(e, () => editor.chain().focus().addColumnAfter().run())}
                title="Add Column Right"
              >
                <Columns3 size={15} />
              </button>
            </div>
          )}

          {/* Desktop Word/Char Counter */}
          <div className="toolbar-counter-pill">
            <span className="counter-words">{wordCount} words</span>
            <span className={`counter-chars ${isNearLimit ? 'near-limit' : ''} ${isOverLimit ? 'over-limit' : ''}`}>
              {characterCount} / {maxChars}
            </span>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           MOBILE MODE: Adaptive Island with [+] Expander (Icon Compartments)
           ══════════════════════════════════════════════════════════════ */
        <div className="mobile-island-wrapper">
          {/* Main Primary Row: Core Text Tools First with Rounded Styling */}
          <div className="mobile-island-primary-row">
            <div className="mobile-primary-track">
              {/* History Pill */}
              <div className="mobile-primary-history-pill">
                <button
                  type="button"
                  className="toolbar-btn"
                  disabled={!canUndo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().undo().run())}
                  title="Undo"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  disabled={!canRedo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().redo().run())}
                  title="Redo"
                >
                  <Redo2 size={14} />
                </button>
              </div>

              <div className="toolbar-v-divider" />

              {/* Heading Dropdown */}
              <HeadingDropdown editor={editor} />

              <div className="toolbar-v-divider" />

              {/* Core Text Styling Capsule with Rounded Corners (B, I, U, S, Spoiler, Link) */}
              <div className="mobile-primary-text-pill">
                <button
                  type="button"
                  className={`toolbar-btn ${isBold ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBold().run())}
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${isItalic ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().toggleItalic().run())}
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${isUnderline ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().toggleUnderline().run())}
                  title="Underline"
                >
                  <UnderlineIcon size={14} />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${isStrike ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => editor.chain().focus().toggleStrike().run())}
                  title="Strikethrough"
                >
                  <Strikethrough size={14} />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn tg-spoiler-btn ${isSpoiler ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSpoiler())}
                  title="Spoiler"
                >
                  <EyeOff size={14} />
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${isLink || buttonsCount > 0 ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleAction(e, onOpenLinkModal)}
                  title="Link & Buttons"
                >
                  <LinkIcon size={14} />
                  {buttonsCount > 0 && <span className="toolbar-badge-count">{buttonsCount}</span>}
                </button>
              </div>

              <div className="toolbar-v-divider" />

              {/* Island Expand Button (+) */}
              <div className="toolbar-btn-group">
                <button
                  ref={emojiBtnRef}
                  type="button"
                  className={`toolbar-btn toolbar-btn-expand ${isMobileExpanded ? 'is-expanded' : ''} ${mediaCount > 0 ? 'has-attachments' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileExpanded((prev) => !prev);
                  }}
                  title={isMobileExpanded ? 'Collapse toolbar' : 'More tools'}
                  aria-label="Toggle full tools station"
                  aria-expanded={isMobileExpanded}
                >
                  <Plus size={16} strokeWidth={2.4} className={`expand-toggle-icon ${isMobileExpanded ? 'is-rotated' : ''}`} />
                  {mediaCount > 0 && !isMobileExpanded && (
                    <span className="toolbar-badge-count">{mediaCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile Expanded Department Rows (Secondary & Advanced Tools) ── */}
          {isMobileExpanded && (
            <div className="mobile-expanded-departments">
              {/* Department 1: Blocks (Structure & Layout) */}
              <div className="mobile-department-row dept-row-blocks">
                <div className="mobile-dept-label-badge dept-badge-monotone">
                  <LayoutGrid size={11} strokeWidth={2.5} />
                  <span>Blocks</span>
                </div>
                <div className="mobile-dept-icons">
                  <div className="dept-subgroup dept-subgroup-pill">
                    <button
                      type="button"
                      className={`toolbar-btn ${isBulletList ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBulletList().run())}
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isOrderedList ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleOrderedList().run())}
                      title="Numbered List"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isTaskList ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleTaskList().run())}
                      title="Task Checklist"
                    >
                      <CheckSquare size={14} />
                    </button>
                  </div>

                  <div className="dept-v-divider" />

                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className={`toolbar-btn ${isBlockquote ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleBlockquote().run())}
                      title="Blockquote"
                    >
                      <Quote size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isDetailsBlock ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleToggleExpandable)}
                      title="Expandable Quote"
                    >
                      <ChevronsDownUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isPullQuote ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertPullQuote)}
                      title="Pull Quote"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>

                  <div className="dept-v-divider" />

                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className={`toolbar-btn ${isTable ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertTable)}
                      title="Table (3x3)"
                    >
                      <TableIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isCodeBlock ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleCodeBlock().run())}
                      title="Code Block"
                    >
                      <FileCode size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Department 2: Insert (Media & Smart Embeds) */}
              <div className="mobile-department-row dept-row-inserts">
                <div className="mobile-dept-label-badge dept-badge-monotone">
                  <Paperclip size={11} strokeWidth={2.5} />
                  <span>Insert</span>
                </div>
                <div className="mobile-dept-icons">
                  <div className="dept-subgroup">
                    {onOpenMediaModal && (
                      <button
                        type="button"
                        className={`toolbar-btn ${mediaCount > 0 ? 'has-attachments' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => handleAction(e, onOpenMediaModal)}
                        title="Attach Media"
                      >
                        <ImageIcon size={14} />
                        {mediaCount > 0 && <span className="toolbar-badge-count">{mediaCount}</span>}
                      </button>
                    )}
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEmojiPickerOpen(true);
                      }}
                      title="Telegram Emoji"
                    >
                      <Smile size={14} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertDivider)}
                      title="Horizontal Divider"
                    >
                      <Minus size={14} />
                    </button>
                  </div>

                  <div className="dept-v-divider" />

                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertMath)}
                      title="LaTeX Math"
                    >
                      <Sigma size={14} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertMap)}
                      title="Location Map"
                    >
                      <MapPin size={14} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, handleInsertReference)}
                      title="Footnote Reference"
                    >
                      <Bookmark size={14} />
                    </button>
                    {onOpenMentionModal && (
                      <button
                        type="button"
                        className="toolbar-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => handleAction(e, onOpenMentionModal)}
                        title="Mention / Date"
                      >
                        <AtSign size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Department 3: More (Advanced Typography & Clear) */}
              <div className="mobile-department-row dept-row-text">
                <div className="mobile-dept-label-badge dept-badge-monotone">
                  <Type size={11} strokeWidth={2.5} />
                  <span>More</span>
                </div>
                <div className="mobile-dept-icons">
                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className={`toolbar-btn ${isHighlight ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleHighlight().run())}
                      title="Highlight Marker"
                    >
                      <Highlighter size={14} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isCode ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().toggleCode().run())}
                      title="Inline Monospace Code"
                    >
                      <Code size={14} />
                    </button>
                  </div>

                  <div className="dept-v-divider" />

                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className={`toolbar-btn ${isSubscript ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSubscript?.())}
                      title="Subscript (X₂)"
                    >
                      <SubscriptIcon size={13} />
                    </button>
                    <button
                      type="button"
                      className={`toolbar-btn ${isSuperscript ? 'active' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => (editor.commands as any).toggleSuperscript?.())}
                      title="Superscript (X²)"
                    >
                      <SuperscriptIcon size={13} />
                    </button>
                  </div>

                  <div className="dept-v-divider" />

                  <div className="dept-subgroup">
                    <button
                      type="button"
                      className="toolbar-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleAction(e, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
                      title="Clear Formatting"
                    >
                      <Eraser size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contextual Table/Code options on Mobile */}
              {(isCodeBlock || isTable) && (
                <div className="mobile-department-row dept-row-contextual is-contextual">
                  <div className="mobile-dept-label-badge dept-badge-monotone">
                    <Settings2 size={11} strokeWidth={2.5} />
                    <span>Options</span>
                  </div>
                  <div className="mobile-dept-icons">
                    {isCodeBlock && (
                      <select
                        className="mobile-code-lang-select"
                        value={currentCodeLang}
                        onChange={(e) => {
                          editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value || null }).run();
                        }}
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {isTable && (
                      <>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleAction(e, () => editor.chain().focus().addRowAfter().run())}
                          title="Add Row"
                        >
                          <Rows3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleAction(e, () => editor.chain().focus().addColumnAfter().run())}
                          title="Add Column"
                        >
                          <Columns3 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Telegram Emoji Picker Dropdown */}
      <EmojiPickerDropdown
        editor={editor}
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        anchorEl={emojiBtnRef.current}
        isMobile={isMobile}
      />
    </div>
  );
};
