import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Sigma, Check, X, Trash2, Pencil } from 'lucide-react';

type MathSnippet = {
  label: string;
  title: string;
  insert: string;
  wrap?: [string, string];
};

const MATH_SNIPPETS: MathSnippet[] = [
  { label: '∫', title: 'Integral', insert: '\\int_{a}^{b}' },
  { label: '∮', title: 'Contour integral', insert: '\\oint' },
  { label: '∑', title: 'Sum', insert: '\\sum_{i=1}^{n}' },
  { label: '∏', title: 'Product', insert: '\\prod_{i=1}^{n}' },
  { label: 'lim', title: 'Limit', insert: '\\lim_{x \\to \\infty}' },
  { label: 'xⁿ', title: 'Power / exponent', wrap: ['^{', '}'], insert: '^{}' },
  { label: 'xₙ', title: 'Subscript', wrap: ['_{', '}'], insert: '_{}' },
  { label: 'a⁄b', title: 'Fraction', wrap: ['\\frac{', '}{}'], insert: '\\frac{a}{b}' },
  { label: '√', title: 'Square root', wrap: ['\\sqrt{', '}'], insert: '\\sqrt{}' },
  { label: 'ⁿ√', title: 'Nth root', insert: '\\sqrt[n]{}' },
  { label: '()', title: 'Big parentheses', wrap: ['\\left(', '\\right)'], insert: '\\left(\\right)' },
  { label: '[]', title: 'Big brackets', wrap: ['\\left[', '\\right]'], insert: '\\left[\\right]' },
  { label: 'π', title: 'Pi', insert: '\\pi' },
  { label: '∞', title: 'Infinity', insert: '\\infty' },
  { label: '±', title: 'Plus-minus', insert: '\\pm' },
  { label: '≠', title: 'Not equal', insert: '\\neq' },
  { label: '≤', title: 'Less or equal', insert: '\\leq' },
  { label: '≥', title: 'Greater or equal', insert: '\\geq' },
  { label: '→', title: 'Arrow', insert: '\\rightarrow' },
  { label: '≈', title: 'Approximately', insert: '\\approx' },
  { label: 'α', title: 'Alpha', insert: '\\alpha' },
  { label: 'β', title: 'Beta', insert: '\\beta' },
  { label: 'θ', title: 'Theta', insert: '\\theta' },
  { label: 'λ', title: 'Lambda', insert: '\\lambda' },
  { label: 'sin', title: 'Sine', insert: '\\sin' },
  { label: 'cos', title: 'Cosine', insert: '\\cos' },
  { label: 'ln', title: 'Natural log', insert: '\\ln' },
  { label: 'eˣ', title: 'Exponential', insert: 'e^{}' },
  { label: '∂', title: 'Partial derivative', insert: '\\partial' },
  { label: '∇', title: 'Nabla', insert: '\\nabla' },
  { label: 'matrix', title: '2×2 matrix', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
];

const insertAtCursor = (
  value: string,
  start: number,
  end: number,
  snippet: MathSnippet
): { next: string; caret: number } => {
  const selected = value.slice(start, end);
  if (snippet.wrap && selected) {
    const next = value.slice(0, start) + snippet.wrap[0] + selected + snippet.wrap[1] + value.slice(end);
    return { next, caret: start + snippet.wrap[0].length + selected.length + snippet.wrap[1].length };
  }
  const token = snippet.insert;
  const next = value.slice(0, start) + token + value.slice(end);
  const hole = token.search(/\{\}/);
  return { next, caret: hole >= 0 ? start + hole + 1 : start + token.length };
};

export const MathBlockView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  editor,
  selected,
}) => {
  const formula = String(node.attrs.formula || '');
  const [isEditing, setIsEditing] = useState(selected);
  const [draft, setDraft] = useState(formula);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(formula);
  }, [formula, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  const renderedHtml = useMemo(() => {
    if (!formula.trim()) return null;
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return null;
    }
  }, [formula]);

  const draftPreviewHtml = useMemo(() => {
    if (!isEditing || !draft.trim()) return null;
    try {
      return katex.renderToString(draft, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return null;
    }
  }, [draft, isEditing]);

  const commit = () => {
    updateAttributes({ formula: draft.trim() });
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(formula);
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  return (
    <NodeViewWrapper
      className={`tiptap-math-node ${selected ? 'is-selected' : ''} ${isEditing ? 'is-editing' : ''}`}
    >
      <div className="math-node-inner" contentEditable={false}>
        <div className="math-node-head">
          <span className="math-node-badge">
            <Sigma size={12} />
            <span>LaTeX</span>
          </span>
          {editor.isEditable && !isEditing && (
            <div className="math-node-actions">
              <button
                type="button"
                className="math-node-btn"
                onClick={() => setIsEditing(true)}
                title="Edit formula"
              >
                <Pencil size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="math-node-btn is-danger"
                onClick={() => deleteNode()}
                title="Remove formula"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="math-node-editor">
            <div className="math-snippet-bar" role="toolbar" aria-label="Formula symbols">
              {MATH_SNIPPETS.map((snippet) => (
                <button
                  key={snippet.title}
                  type="button"
                  className="math-snippet-btn"
                  title={snippet.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const el = textareaRef.current;
                    const start = el?.selectionStart ?? draft.length;
                    const end = el?.selectionEnd ?? draft.length;
                    const { next, caret } = insertAtCursor(draft, start, end, snippet);
                    setDraft(next);
                    requestAnimationFrame(() => {
                      if (!textareaRef.current) return;
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(caret, caret);
                    });
                  }}
                >
                  {snippet.label}
                </button>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="math-node-input"
              value={draft}
              spellCheck={false}
              rows={3}
              placeholder="\int_0^1 x^2\,dx = \frac{1}{3}"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="math-node-live">
              {draftPreviewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: draftPreviewHtml }} />
              ) : (
                <span className="math-node-empty">Live preview appears here</span>
              )}
            </div>
            <div className="math-node-editor-actions">
              <button type="button" className="math-node-btn is-primary" onClick={commit}>
                <Check size={12} />
                <span>Apply</span>
              </button>
              <button type="button" className="math-node-btn" onClick={cancel}>
                <X size={12} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="math-node-render"
            role={editor.isEditable ? 'button' : undefined}
            tabIndex={editor.isEditable ? 0 : undefined}
            onClick={() => editor.isEditable && setIsEditing(true)}
            onKeyDown={(event) => {
              if (!editor.isEditable) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsEditing(true);
              }
            }}
          >
            {renderedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : (
              <span className="math-node-empty">Tap to write a LaTeX formula</span>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
