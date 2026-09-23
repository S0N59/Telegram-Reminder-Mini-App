import React from 'react';
import { Quote } from 'lucide-react';

interface QuoteBlockProps {
  id: string;
  text: string;
  author?: string;
  onUpdateText: (text: string) => void;
  onUpdateAuthor: (author: string) => void;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  text,
  author,
  onUpdateText,
  onUpdateAuthor,
}) => {
  return (
    <div className="quote-block-container">
      <div className="quote-block-inner">
        <Quote size={16} className="quote-badge-icon" />
        <textarea
          className="quote-text-input"
          placeholder="Enter quote text..."
          rows={2}
          value={text}
          onChange={(e) => onUpdateText(e.target.value)}
        />
      </div>
      <div className="quote-author-row">
        <span className="quote-dash">—</span>
        <input
          type="text"
          className="quote-author-input"
          placeholder="Author or source (optional)"
          value={author || ''}
          onChange={(e) => onUpdateAuthor(e.target.value)}
        />
      </div>
    </div>
  );
};
