import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MathBlockView } from './nodeviews/MathBlockView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMathBlock: (attributes: { formula: string }) => ReturnType;
    };
  }
}

export const MathBlockExtension = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      formula: {
        default: '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}',
        parseHTML: (element) => element.getAttribute('data-formula') || element.textContent || '',
        renderHTML: (attributes) => ({
          'data-formula': attributes.formula,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'tg-math-block' },
      { tag: 'div[data-type="math-block"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const formula = HTMLAttributes['data-formula'] || '';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'tiptap-math-block',
        'data-type': 'math-block',
      }),
      `$$ ${formula} $$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addCommands() {
    return {
      insertMathBlock:
        (attrs) =>
        ({ commands, editor }) => {
          const { doc, selection } = editor.state;
          const isAtDocEnd = selection.$to.pos >= doc.content.size - 1;
          const content: Record<string, any>[] = [{ type: this.name, attrs }];
          // An atom at the very end leaves nowhere to put the caret afterwards.
          if (isAtDocEnd) content.push({ type: 'paragraph' });
          return commands.insertContent(content);
        },
    };
  },
});
