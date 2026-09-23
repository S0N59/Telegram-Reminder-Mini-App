import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pullQuote: {
      setPullQuote: (attributes?: { author?: string }) => ReturnType;
      togglePullQuote: (attributes?: { author?: string }) => ReturnType;
      unsetPullQuote: () => ReturnType;
    };
  }
}

export const PullQuoteExtension = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'block+',
  defining: true,
  // Must outrank TelegramBlockquote, otherwise its generic `blockquote`
  // parse rule swallows `<blockquote data-type="pullquote">`.
  priority: 200,

  addAttributes() {
    return {
      author: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-author') || '',
        renderHTML: (attributes) => {
          if (!attributes.author) return {};
          return { 'data-author': attributes.author };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote[data-type="pullquote"]',
      },
      {
        tag: 'div[data-type="pullquote"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // A plain div — never <blockquote>. Native quote tags + React NodeViews
    // freeze Telegram's mobile WebView.
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'pullquote',
        class: 'tiptap-pull-quote',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setPullQuote:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      togglePullQuote:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
      unsetPullQuote:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
