import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  EyeOff,
  Code,
  Quote,
  Link as LinkIcon,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  AtSign,
} from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';

interface FloatingBubbleMenuProps {
  editor: Editor | null;
  onOpenLinkModal: () => void;
  onOpenMentionModal?: () => void;
}

export const FloatingBubbleMenu: React.FC<FloatingBubbleMenuProps> = ({
  editor,
  onOpenLinkModal,
  onOpenMentionModal,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { from, to } = editor.state.selection;
      const isTextSelected = from !== to && !editor.state.selection.empty;

      if (!isTextSelected || !editor.isFocused) {
        setVisible(false);
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setVisible(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        setVisible(false);
        return;
      }

      const menuWidth = 360;
      const menuHeight = 44;

      // Position centered above selection
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      let top = rect.top - menuHeight - 10;

      // Boundary checks
      if (left < 10) left = 10;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }

      // If too close to top of viewport, flip below selection
      if (top < 10) {
        top = rect.bottom + 10;
      }

      setCoords({ top, left });
      setVisible(true);
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => {
      // Delay hide to allow button clicks
      setTimeout(() => setVisible(false), 150);
    });

    return () => {
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor]);

  if (!visible || !editor) return null;

  const handleAction = (callback: () => void) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    callback();
  };

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isStrike = editor.isActive('strike');
  const isHighlight = editor.isActive('highlight');
  const isSpoiler = editor.isActive('spoiler');
  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isH3 = editor.isActive('heading', { level: 3 });
  const isCode = editor.isActive('code');
  const isBlockquote = editor.isActive('blockquote');
  const isLink = editor.isActive('link');

  return (
    <OverlayPortal>
      <div
        ref={menuRef}
        className="floating-bubble-menu animate-fade-in tg-selection-pill"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 999,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
    >
      <div className="bubble-cluster">
        <button
          type="button"
          className={`bubble-btn ${isH1 ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          title="Heading 1"
        >
          <Heading1 size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isH2 ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          title="Heading 2"
        >
          <Heading2 size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isH3 ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          title="Heading 3"
        >
          <Heading3 size={14} />
        </button>
      </div>

      <div className="bubble-divider" />

      <div className="bubble-cluster">
        <button
          type="button"
          className={`bubble-btn ${isBold ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleBold().run())}
          title="Bold"
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isItalic ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleItalic().run())}
          title="Italic"
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isUnderline ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleUnderline().run())}
          title="Underline"
        >
          <UnderlineIcon size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isStrike ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleStrike().run())}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isHighlight ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleHighlight().run())}
          title="Highlight"
        >
          <Highlighter size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn bubble-spoiler ${isSpoiler ? 'active' : ''}`}
          onClick={() => handleAction(() => (editor.chain().focus() as any).toggleSpoiler().run())}
          title="Telegram Spoiler"
        >
          <EyeOff size={14} />
        </button>
      </div>

      <div className="bubble-divider" />

      <div className="bubble-cluster">
        <button
          type="button"
          className={`bubble-btn ${isCode ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleCode().run())}
          title="Inline Code"
        >
          <Code size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isBlockquote ? 'active' : ''}`}
          onClick={() => handleAction(() => editor.chain().focus().toggleBlockquote().run())}
          title="Quote"
        >
          <Quote size={14} />
        </button>

        <button
          type="button"
          className={`bubble-btn ${isLink ? 'active' : ''}`}
          onClick={() => handleAction(onOpenLinkModal)}
          title="Link"
        >
          <LinkIcon size={14} />
        </button>

        {onOpenMentionModal && (
          <button
            type="button"
            className="bubble-btn"
            onClick={() => handleAction(onOpenMentionModal)}
            title="Mention / Timestamp"
          >
            <AtSign size={14} />
          </button>
        )}
      </div>
    </div>
  </OverlayPortal>
  );
};
