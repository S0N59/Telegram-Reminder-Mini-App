import React from 'react';
import { Paperclip, FileText, Trash2 } from 'lucide-react';
import { formatFileSize } from '../../utils/fileUpload';

interface FileBlockProps {
  id: string;
  name: string;
  size: number;
  extension: string;
  onRemove: () => void;
}

export const FileBlock: React.FC<FileBlockProps> = ({
  name,
  size,
  extension,
  onRemove,
}) => {
  return (
    <div className="file-block-card">
      <div className="file-icon-box">
        <FileText size={20} className="file-svg-icon" />
        <span className="file-ext-badge">{extension.slice(0, 4)}</span>
      </div>

      <div className="file-details">
        <span className="file-name" title={name}>
          {name}
        </span>
        <span className="file-meta">
          {formatFileSize(size)} · Telegram document
        </span>
      </div>

      <button
        type="button"
        className="file-remove-btn"
        onClick={onRemove}
        title="Remove file"
        aria-label="Remove"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
};
