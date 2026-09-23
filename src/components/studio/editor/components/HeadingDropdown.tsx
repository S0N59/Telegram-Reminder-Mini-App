import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { ChevronDown, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Pilcrow } from 'lucide-react';

interface HeadingDropdownProps {
  editor: Editor | null;
}

export const HeadingDropdown: React.FC<HeadingDropdownProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!editor) return null;

  const currentLevel = ([1, 2, 3, 4, 5, 6] as const).find((lvl) =>
    editor.isActive('heading', { level: lvl })
  );

  const getLabel = () => {
    if (currentLevel) return `H${currentLevel}`;
    return 'H';
  };

  const handleSelect = (e: React.MouseEvent, level: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    e.preventDefault();
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}

    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="heading-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`toolbar-btn heading-dropdown-trigger ${currentLevel ? 'active' : ''} ${isOpen ? 'is-open' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }}
        title={currentLevel ? `Heading ${currentLevel}` : 'Headings (H1-H6)'}
        aria-label="Text Heading Level"
        aria-expanded={isOpen}
      >
        <span className="heading-dropdown-label">{getLabel()}</span>
        <ChevronDown size={11} className={`heading-chevron ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="heading-dropdown-menu animate-fade-in" role="menu">
          <button
            type="button"
            className={`heading-menu-item ${!currentLevel ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 0)}
          >
            <Pilcrow size={14} className="heading-item-icon" />
            <span className="heading-item-title">Normal text</span>
            <span className="heading-item-shortcut">¶</span>
          </button>

          <div className="heading-menu-divider" />

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 1 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 1)}
          >
            <Heading1 size={14} className="heading-item-icon" />
            <span className="heading-item-title heading-title-h1">Heading 1</span>
            <span className="heading-item-tag">H1</span>
          </button>

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 2 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 2)}
          >
            <Heading2 size={14} className="heading-item-icon" />
            <span className="heading-item-title heading-title-h2">Heading 2</span>
            <span className="heading-item-tag">H2</span>
          </button>

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 3 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 3)}
          >
            <Heading3 size={14} className="heading-item-icon" />
            <span className="heading-item-title heading-title-h3">Heading 3</span>
            <span className="heading-item-tag">H3</span>
          </button>

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 4 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 4)}
          >
            <Heading4 size={14} className="heading-item-icon" />
            <span className="heading-item-title">Heading 4</span>
            <span className="heading-item-tag">H4</span>
          </button>

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 5 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 5)}
          >
            <Heading5 size={14} className="heading-item-icon" />
            <span className="heading-item-title">Heading 5</span>
            <span className="heading-item-tag">H5</span>
          </button>

          <button
            type="button"
            className={`heading-menu-item ${currentLevel === 6 ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => handleSelect(e, 6)}
          >
            <Heading6 size={14} className="heading-item-icon" />
            <span className="heading-item-title">Heading 6</span>
            <span className="heading-item-tag">H6</span>
          </button>
        </div>
      )}
    </div>
  );
};
