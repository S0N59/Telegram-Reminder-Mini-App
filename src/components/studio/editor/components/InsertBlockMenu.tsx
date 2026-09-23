import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  ChevronsDownUp,
  Sparkles,
  Sigma,
  MapPin,
  Bookmark,
  Minus,
  X,
  Search,
  Smile,
  Image as ImageIcon,
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
} from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';

interface InsertBlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  anchorEl: HTMLElement | null;
  isMobile?: boolean;
  onOpenMediaModal?: () => void;
  onOpenLinkModal?: () => void;
  onOpenEmojiPicker?: () => void;
  onOpenMentionModal?: () => void;
  mediaCount?: number;
  buttonsCount?: number;
}

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

const MENU_WIDTH = 360;
const MENU_HEIGHT = 500;

export const InsertBlockMenu: React.FC<InsertBlockMenuProps> = ({
  isOpen,
  onClose,
  editor,
  anchorEl,
  isMobile = false,
  onOpenMediaModal,
  onOpenLinkModal,
  onOpenEmojiPicker,
  onOpenMentionModal,
  mediaCount = 0,
  buttonsCount = 0,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'bottom' | 'top' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const isSmallScreen = isMobile || (typeof window !== 'undefined' && window.innerWidth < 900);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    // Calculate desktop popover position relative to anchor
    if (anchorEl && !isSmallScreen) {
      const rect = anchorEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 10;
      let placement: 'bottom' | 'top' = 'bottom';

      if (spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow) {
        top = Math.max(12, rect.top - MENU_HEIGHT - 10);
        placement = 'top';
      }

      const left = Math.max(12, Math.min(rect.left - 240, window.innerWidth - MENU_WIDTH - 16));
      setCoords({ top, left, placement });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, anchorEl, isSmallScreen, onClose]);

  if (!isOpen || !editor) return null;

  const handleAction = (callback: () => void) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    callback();
    onClose();
  };

  const handleFormatAction = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    callback();
  };

  const headingLevel = [1, 2, 3, 4, 5, 6].find((level) =>
    editor.isActive('heading', { level })
  ) as 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');
  const isTaskList = editor.isActive('taskList');
  const isHighlight = editor.isActive('highlight');
  const isCode = editor.isActive('code');
  const isSubscript = editor.isActive('subscript');
  const isSuperscript = editor.isActive('superscript');
  const isBlockquote = editor.isActive('blockquote');
  const isCodeBlock = editor.isActive('codeBlock');
  const isTable = editor.isActive('table');

  const currentCodeLang = editor.getAttributes('codeBlock').language || '';

  // Blocks are inserted as ProseMirror JSON rather than HTML strings
  const paragraph = (text: string) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });

  const isSelectionEmpty = () => editor.state.selection.empty;

  const handleToggleExpandable = () => {
    if (editor.isActive('detailsBlock')) {
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
    if (editor.isActive('pullQuote')) {
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

  type MenuItem = {
    id: string;
    category: string;
    name: string;
    desc: string;
    accent: string;
    icon: React.ReactNode;
    badge?: number;
    action: () => void;
  };

  const allItems: MenuItem[] = [
    // 1. Media & Attachments
    ...(onOpenMediaModal
      ? [
          {
            id: 'media',
            category: 'Media & attachments',
            name: 'Media Attachment',
            desc: 'Photo, video or audio with spoiler',
            accent: '#38bdf8',
            icon: <ImageIcon size={17} />,
            badge: mediaCount,
            action: () => onOpenMediaModal(),
          } as MenuItem,
        ]
      : []),
    ...(onOpenEmojiPicker
      ? [
          {
            id: 'emoji',
            category: 'Media & attachments',
            name: 'Telegram Custom Emoji',
            desc: 'Emoji packs from your connected bot',
            accent: '#fbbf24',
            icon: <Smile size={17} />,
            action: () => onOpenEmojiPicker(),
          } as MenuItem,
        ]
      : []),
    ...(onOpenLinkModal
      ? [
          {
            id: 'buttons',
            category: 'Media & attachments',
            name: 'Inline Buttons & Links',
            desc: 'URL and WebApp action buttons',
            accent: '#818cf8',
            icon: <LinkIcon size={17} />,
            badge: buttonsCount,
            action: () => onOpenLinkModal(),
          } as MenuItem,
        ]
      : []),

    // 2. Structure & Blocks
    {
      id: 'blockquote',
      category: 'Structure & blocks',
      name: 'Telegram Blockquote',
      desc: 'Standard vertical citation bar',
      accent: '#eab308',
      icon: <Quote size={17} />,
      action: () => {
        editor.chain().focus().toggleBlockquote().run();
      },
    },
    {
      id: 'exp-quote',
      category: 'Structure & blocks',
      name: 'Expandable Quote',
      desc: '“Show me more” collapsible section',
      accent: '#a855f7',
      icon: <ChevronsDownUp size={17} />,
      action: handleToggleExpandable,
    },
    {
      id: 'pullquote',
      category: 'Structure & blocks',
      name: 'Editorial Pull Quote',
      desc: 'Featured callout with author caption',
      accent: '#00d2ff',
      icon: <Sparkles size={17} />,
      action: handleInsertPullQuote,
    },
    {
      id: 'checklist',
      category: 'Structure & blocks',
      name: 'Task Checklist',
      desc: 'Interactive checkbox list items',
      accent: '#10b981',
      icon: <CheckSquare size={17} />,
      action: () => {
        editor.chain().focus().toggleTaskList().run();
      },
    },
    {
      id: 'table',
      category: 'Structure & blocks',
      name: 'Table (3×3)',
      desc: isTable ? 'Remove table at cursor' : 'Structured grid table with header',
      accent: '#38bdf8',
      icon: <TableIcon size={17} />,
      action: () => {
        if (isTable) {
          editor.chain().focus().deleteTable().run();
        } else {
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }
      },
    },
    {
      id: 'codeblock',
      category: 'Structure & blocks',
      name: 'Code Block',
      desc: 'Preformatted code with syntax highlighting',
      accent: '#22c55e',
      icon: <FileCode size={17} />,
      action: () => {
        editor.chain().focus().toggleCodeBlock().run();
      },
    },
    {
      id: 'divider',
      category: 'Structure & blocks',
      name: 'Horizontal Divider',
      desc: 'Visual section separator line',
      accent: '#94a3b8',
      icon: <Minus size={17} />,
      action: () => {
        editor.chain().focus().setHorizontalRule().insertContent({ type: 'paragraph' }).run();
      },
    },

    // 3. Advanced & Embeds
    {
      id: 'math',
      category: 'Advanced & embeds',
      name: 'LaTeX Math Formula',
      desc: 'Mathematical expression block (KaTeX)',
      accent: '#8b5cf6',
      icon: <Sigma size={17} />,
      action: handleInsertMath,
    },
    {
      id: 'map',
      category: 'Advanced & embeds',
      name: 'Location Pin (Map)',
      desc: 'Geographic coordinate pin',
      accent: '#ef4444',
      icon: <MapPin size={17} />,
      action: handleInsertMap,
    },
    {
      id: 'reference',
      category: 'Advanced & embeds',
      name: 'Footnote Reference',
      desc: 'Superscript number + quote-style note',
      accent: '#06b6d4',
      icon: <Bookmark size={17} />,
      action: handleInsertReference,
    },
  ];

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = query
    ? allItems.filter(
        (it) =>
          it.name.toLowerCase().includes(query) ||
          it.desc.toLowerCase().includes(query) ||
          it.category.toLowerCase().includes(query)
      )
    : allItems;

  // Group filtered items by category, preserving declaration order
  const categories: { [cat: string]: MenuItem[] } = {};
  filteredItems.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  return (
    <OverlayPortal>
      {/* Universal Backdrop */}
      <div
        className="insert-block-backdrop animate-fade-in"
        onClick={onClose}
        onTouchStart={(e) => e.stopPropagation()}
      />

      {/* Menu Container (Anchored Popover on Desktop, Native Bottom Sheet on Mobile) */}
      <div
        ref={menuRef}
        className={`insert-block-container ${isSmallScreen ? 'is-mobile-sheet' : 'is-desktop-popover'} animate-fade-in`}
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
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title, Quick Formatting & Search */}
        <div className="insert-block-sheet-header">
          {isSmallScreen && <div className="sheet-drag-handle" />}
          
          <div className="sheet-title-row">
            <div className="sheet-title-col">
              <span className="sheet-title">Tools &amp; Insert</span>
              <span className="sheet-subtitle">Formatting, media, blocks &amp; embeds</span>
            </div>
            <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Quick Formatting Shelf inside Hub */}
          <div className="sheet-quick-formatting" role="toolbar" aria-label="Quick formatting">
            {/* Row 1: Headings & Tools */}
            <div className="quick-format-row">
              <div className="quick-format-pill-group">
                <span className="quick-group-label">Titles</span>
                {([1, 2, 3, 4, 5, 6] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`quick-format-btn ${headingLevel === level ? 'active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) =>
                      handleFormatAction(e, () => editor.chain().focus().toggleHeading({ level }).run())
                    }
                    title={`Heading ${level}`}
                    aria-label={`Heading ${level}`}
                  >
                    H{level}
                  </button>
                ))}
              </div>

              <div className="quick-format-pill-group">
                <span className="quick-group-label">Tools</span>
                {onOpenMentionModal && (
                  <button
                    type="button"
                    className="quick-format-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onClose();
                      onOpenMentionModal();
                    }}
                    title="Insert Mention or Date Chip"
                    aria-label="Mention or Date"
                  >
                    <AtSign size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="quick-format-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) =>
                    handleFormatAction(e, () => editor.chain().focus().unsetAllMarks().clearNodes().run())
                  }
                  title="Clear Formatting"
                  aria-label="Clear Formatting"
                >
                  <Eraser size={14} />
                </button>
              </div>
            </div>

            {/* Row 2: Lists & Secondary Inline Marks */}
            <div className="quick-format-row">
              <div className="quick-format-pill-group">
                <span className="quick-group-label">Lists</span>
                <button
                  type="button"
                  className={`quick-format-btn ${isBulletList ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => editor.chain().focus().toggleBulletList().run())}
                  title="Bullet List"
                  aria-label="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  className={`quick-format-btn ${isOrderedList ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => editor.chain().focus().toggleOrderedList().run())}
                  title="Numbered List"
                  aria-label="Numbered List"
                >
                  <ListOrdered size={14} />
                </button>
                <button
                  type="button"
                  className={`quick-format-btn ${isTaskList ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => editor.chain().focus().toggleTaskList().run())}
                  title="Task Checklist"
                  aria-label="Task Checklist"
                >
                  <CheckSquare size={14} />
                </button>
              </div>

              <div className="quick-format-pill-group">
                <span className="quick-group-label">Marks</span>
                <button
                  type="button"
                  className={`quick-format-btn ${isHighlight ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => editor.chain().focus().toggleHighlight().run())}
                  title="Highlight"
                  aria-label="Highlight"
                >
                  <Highlighter size={14} />
                </button>
                <button
                  type="button"
                  className={`quick-format-btn ${isCode ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => editor.chain().focus().toggleCode().run())}
                  title="Inline Monospace Code"
                  aria-label="Inline Code"
                >
                  <Code size={14} />
                </button>
                <button
                  type="button"
                  className={`quick-format-btn ${isSubscript ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => (editor.commands as any).toggleSubscript?.())}
                  title="Subscript (X₂)"
                  aria-label="Subscript"
                >
                  <SubscriptIcon size={14} />
                </button>
                <button
                  type="button"
                  className={`quick-format-btn ${isSuperscript ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleFormatAction(e, () => (editor.commands as any).toggleSuperscript?.())}
                  title="Superscript (X²)"
                  aria-label="Superscript"
                >
                  <SuperscriptIcon size={14} />
                </button>
              </div>
            </div>

            {/* Row 3: Contextual Tools (Code Block Language / Table Tools) */}
            {(isCodeBlock || isTable) && (
              <div className="quick-format-row contextual-row">
                {isCodeBlock && (
                  <div className="quick-format-pill-group contextual-group">
                    <span className="quick-group-label">Code Lang</span>
                    <select
                      className="quick-code-select"
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
                  <div className="quick-format-pill-group contextual-group">
                    <span className="quick-group-label">Table</span>
                    <button
                      type="button"
                      className="quick-format-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleFormatAction(e, () => editor.chain().focus().addRowAfter().run())}
                      title="Add Row Below"
                      aria-label="Add Row Below"
                    >
                      <Rows3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="quick-format-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleFormatAction(e, () => editor.chain().focus().addColumnAfter().run())}
                      title="Add Column Right"
                      aria-label="Add Column Right"
                    >
                      <Columns3 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Filter Search */}
          <div className="sheet-search-row">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="sheet-search-input"
              placeholder="Search blocks &amp; media…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={!isSmallScreen}
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

        {/* Scrollable List of Blocks, Media & Embeds */}
        <div className="insert-block-scroll-list">
          {Object.keys(categories).length === 0 ? (
            <div className="sheet-empty-state">
              <Search size={20} />
              <span>No blocks match &ldquo;{searchQuery}&rdquo;</span>
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <div key={category} className="sheet-category-group">
                <div className="insert-menu-section-title">{category}</div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="insert-menu-item"
                    style={{ ['--item-accent' as any]: item.accent }}
                    onClick={() => handleAction(item.action)}
                  >
                    <span className="menu-item-icon-wrap">{item.icon}</span>
                    <span className="menu-item-text-wrap">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="menu-item-desc">{item.desc}</span>
                    </span>
                    {!!item.badge && <span className="menu-item-badge">{item.badge}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </OverlayPortal>
  );
};
