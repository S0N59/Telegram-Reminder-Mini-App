import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Rows,
  Columns,
  Trash2,
  Table as TableIcon,
  Plus,
  Minus,
} from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';

interface TableFloatingToolbarProps {
  editor: Editor | null;
}

const MOBILE_BREAKPOINT = 768;
const SIDE_MARGIN = 8;

export const TableFloatingToolbar: React.FC<TableFloatingToolbarProps> = ({ editor }) => {
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);
  const [size, setSize] = useState({ width: 320, height: 40 });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncTableRect = useCallback(() => {
    if (!editor || !editor.isActive('table')) {
      setTableRect(null);
      return;
    }

    const domSelection = window.getSelection();
    const anchorNode = domSelection?.anchorNode ?? null;
    const element = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
    const tableEl = element?.closest('table');

    if (!tableEl) {
      setTableRect(null);
      return;
    }

    setTableRect(tableEl.getBoundingClientRect());
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => setTableRect(null), 200);
    };

    editor.on('selectionUpdate', syncTableRect);
    editor.on('transaction', syncTableRect);
    editor.on('focus', syncTableRect);
    editor.on('blur', handleBlur);

    // The table moves with the page, so track scroll and viewport changes too.
    window.addEventListener('scroll', syncTableRect, true);
    window.addEventListener('resize', syncTableRect);
    window.visualViewport?.addEventListener('resize', syncTableRect);
    window.visualViewport?.addEventListener('scroll', syncTableRect);

    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      editor.off('selectionUpdate', syncTableRect);
      editor.off('transaction', syncTableRect);
      editor.off('focus', syncTableRect);
      editor.off('blur', handleBlur);
      window.removeEventListener('scroll', syncTableRect, true);
      window.removeEventListener('resize', syncTableRect);
      window.visualViewport?.removeEventListener('resize', syncTableRect);
      window.visualViewport?.removeEventListener('scroll', syncTableRect);
    };
  }, [editor, syncTableRect]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Measure the rendered bar instead of assuming a fixed width, otherwise the
  // clamping math pushes half of the buttons off-screen on narrow viewports.
  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (Math.abs(rect.width - size.width) > 1 || Math.abs(rect.height - size.height) > 1) {
      setSize({ width: rect.width, height: rect.height });
    }
  }, [tableRect, isMobile, size.width, size.height]);

  if (!tableRect || !editor) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Mobile: span the full width so every control stays reachable (the bar wraps
  // onto a second line via CSS). Desktop: centre it over the table.
  const maxWidth = viewportWidth - SIDE_MARGIN * 2;
  const width = isMobile ? maxWidth : Math.min(size.width, maxWidth);

  let left = isMobile
    ? SIDE_MARGIN
    : tableRect.left + tableRect.width / 2 - width / 2;
  left = Math.max(SIDE_MARGIN, Math.min(left, viewportWidth - width - SIDE_MARGIN));

  const spaceAbove = tableRect.top;
  const gap = 8;
  let top = tableRect.top - size.height - gap;
  if (spaceAbove < size.height + gap + 52) {
    // Not enough headroom above the table — drop below it instead of covering it.
    top = tableRect.bottom + gap;
  }
  top = Math.max(52, Math.min(top, viewportHeight - size.height - SIDE_MARGIN));

  const handleAction = (callback: () => void) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    callback();
    syncTableRect();
  };

  return (
    <OverlayPortal>
      <div
        ref={toolbarRef}
        className={`table-floating-toolbar animate-fade-in ${isMobile ? 'is-mobile' : ''}`}
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: isMobile ? `${width}px` : undefined,
          maxWidth: `${maxWidth}px`,
          zIndex: 998,
        }}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="table-toolbar-group">
          <span className="table-toolbar-label">
            <TableIcon size={12} />
            <span>Row</span>
          </span>
          <button
            type="button"
            className="table-toolbar-btn"
            onClick={() => handleAction(() => editor.chain().focus().addRowBefore().run())}
            title="Add row above"
          >
            <Plus size={11} />
            <span>Above</span>
          </button>
          <button
            type="button"
            className="table-toolbar-btn"
            onClick={() => handleAction(() => editor.chain().focus().addRowAfter().run())}
            title="Add row below"
          >
            <Plus size={11} />
            <span>Below</span>
          </button>
          <button
            type="button"
            className="table-toolbar-btn delete-action"
            onClick={() => handleAction(() => editor.chain().focus().deleteRow().run())}
            title="Delete current row"
          >
            <Minus size={11} />
            <span>Del</span>
          </button>
        </div>

        <div className="table-toolbar-divider" />

        <div className="table-toolbar-group">
          <span className="table-toolbar-label">
            <Columns size={12} />
            <span>Col</span>
          </span>
          <button
            type="button"
            className="table-toolbar-btn"
            onClick={() => handleAction(() => editor.chain().focus().addColumnBefore().run())}
            title="Add column left"
          >
            <Plus size={11} />
            <span>Left</span>
          </button>
          <button
            type="button"
            className="table-toolbar-btn"
            onClick={() => handleAction(() => editor.chain().focus().addColumnAfter().run())}
            title="Add column right"
          >
            <Plus size={11} />
            <span>Right</span>
          </button>
          <button
            type="button"
            className="table-toolbar-btn delete-action"
            onClick={() => handleAction(() => editor.chain().focus().deleteColumn().run())}
            title="Delete current column"
          >
            <Minus size={11} />
            <span>Del</span>
          </button>
        </div>

        <div className="table-toolbar-divider" />

        <div className="table-toolbar-group">
          <button
            type="button"
            className="table-toolbar-btn"
            onClick={() => handleAction(() => editor.chain().focus().toggleHeaderRow().run())}
            title="Toggle header row"
          >
            <Rows size={12} />
            <span>Header</span>
          </button>
          <button
            type="button"
            className="table-toolbar-btn delete-table-btn"
            onClick={() => handleAction(() => editor.chain().focus().deleteTable().run())}
            title="Delete entire table"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
};
