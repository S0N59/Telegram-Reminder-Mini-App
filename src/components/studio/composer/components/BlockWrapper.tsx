import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';

interface BlockWrapperProps {
  id: string;
  index: number;
  totalBlocks: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  id,
  index,
  totalBlocks,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="composer-block-wrapper group">
      {/* Contextual Block Handle Bar */}
      <div className="block-controls-bar">
        <div className="block-drag-indicator">
          <GripVertical size={14} />
        </div>

        <div className="block-action-buttons">
          {index > 0 && (
            <button
              type="button"
              className="block-ctrl-btn"
              onClick={onMoveUp}
              title="Move Up"
              aria-label="Move Up"
            >
              <ArrowUp size={13} />
            </button>
          )}

          {index < totalBlocks - 1 && (
            <button
              type="button"
              className="block-ctrl-btn"
              onClick={onMoveDown}
              title="Move Down"
              aria-label="Move Down"
            >
              <ArrowDown size={13} />
            </button>
          )}

          <button
            type="button"
            className="block-ctrl-btn"
            onClick={onDuplicate}
            title="Duplicate Block"
            aria-label="Duplicate"
          >
            <Copy size={13} />
          </button>

          {totalBlocks > 1 && (
            <button
              type="button"
              className="block-ctrl-btn danger"
              onClick={onDelete}
              title="Delete Block"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Block Content */}
      <div className="block-inner-content">
        {children}
      </div>
    </div>
  );
};
