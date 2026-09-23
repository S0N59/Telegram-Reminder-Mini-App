import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    details: {
      setDetails: (attributes?: { title?: string; open?: boolean }) => ReturnType;
      toggleDetails: () => ReturnType;
    };
  }
}

export const DetailsExtension = Node.create({
  name: 'detailsBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Show me more',
        parseHTML: (element) =>
          element.querySelector?.('summary')?.textContent ||
          element.getAttribute('data-title') ||
          'Show me more',
        renderHTML: (attributes) => ({
          'data-title': attributes.title || 'Show me more',
        }),
      },
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open') || element.getAttribute('data-open') === 'true',
        renderHTML: (attributes) => (attributes.open ? { open: '', 'data-open': 'true' } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'details',
      },
      {
        tag: 'div[data-type="details-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Never render a native <details> in the editor: iOS Telegram WebView
    // crashes contenteditable when it hits summary/details.
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'tiptap-details-block',
        'data-type': 'details-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDetails:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleDetails:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
