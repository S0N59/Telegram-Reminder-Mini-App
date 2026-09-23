import { Node, Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    reference: {
      insertReferenceMark: (attributes: { refId: string }) => ReturnType;
      insertReferenceBlock: (attributes: { id: string; label: string; text: string; url?: string }) => ReturnType;
    };
  }
}

export const ReferenceMarkExtension = Mark.create({
  name: 'referenceMark',

  addAttributes() {
    return {
      refId: {
        default: '1',
        parseHTML: (element) => element.getAttribute('data-ref-id') || '1',
        renderHTML: (attributes) => ({
          'data-ref-id': attributes.refId,
          class: 'tg-ref-citation',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-ref-id]' }, { tag: 'span.tg-ref-citation' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertReferenceMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
    };
  },
});

export const ReferenceBlockExtension = Node.create({
  name: 'referenceBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      id: {
        default: '1',
        parseHTML: (element) => element.getAttribute('data-ref-id') || '1',
        renderHTML: (attributes) => ({ 'data-ref-id': attributes.id }),
      },
      label: {
        default: '[1]',
        parseHTML: (element) => element.getAttribute('data-ref-label') || '[1]',
        renderHTML: (attributes) => ({ 'data-ref-label': attributes.label }),
      },
      text: {
        default: 'Reference source',
        parseHTML: (element) => element.getAttribute('data-ref-text') || 'Reference source',
        renderHTML: (attributes) => ({ 'data-ref-text': attributes.text }),
      },
      url: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-ref-url') || '',
        renderHTML: (attributes) => (attributes.url ? { 'data-ref-url': attributes.url } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="tg-reference-block"]' },
      { tag: 'div.tiptap-reference-block' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes['data-ref-label'] || '[1]';
    const text = HTMLAttributes['data-ref-text'] || '';
    const url = HTMLAttributes['data-ref-url'] || '';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'tiptap-reference-block',
        'data-type': 'tg-reference-block',
      }),
      ['span', { class: 'tg-ref-label' }, label],
      ['span', { class: 'tg-ref-text' }, text],
      url ? ['a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'tg-ref-link' }, ' [link]'] : ['span', {}],
    ];
  },

  addCommands() {
    return {
      insertReferenceBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
