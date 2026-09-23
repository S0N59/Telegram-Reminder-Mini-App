import React, { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  id: string;
  code: string;
  language: string;
  onUpdateCode: (code: string) => void;
  onUpdateLanguage: (language: string) => void;
}

const COMMON_LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'json',
  'bash',
  'html',
  'css',
  'sql',
  'cpp',
  'csharp',
  'rust',
  'go',
];

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  onUpdateCode,
  onUpdateLanguage,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-lang-selector-wrap">
          <Code size={14} className="code-header-icon" />
          <select
            className="code-lang-select"
            value={language}
            onChange={(e) => onUpdateLanguage(e.target.value)}
          >
            <option value="">Plain text</option>
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <textarea
        className="code-textarea"
        placeholder="// Paste or write code snippet here..."
        rows={4}
        value={code}
        onChange={(e) => onUpdateCode(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};
