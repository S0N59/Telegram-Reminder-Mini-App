import { Node, mergeAttributes } from '@tiptap/core';

export interface TelegramBlockquoteOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    telegramBlockquote: {
      setBlockquote: () => ReturnType;
      toggleBlockquote: () => ReturnType;
      unsetBlockquote: () => ReturnType;
      toggleExpandableBlockquote: () => ReturnType;
    };
  }
}

export const TelegramBlockquote = Node.create<TelegramBlockquoteOptions>({
  name: 'blockquote',
  content: 'block+',
  group: 'block',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      expandable: {
        default: false,
        parseHTML: (element) =>
          element.hasAttribute('expandable') ||
          element.getAttribute('data-expandable') === 'true' ||
          element.classList.contains('is-expandable'),
        renderHTML: (attributes) => {
          if (!attributes.expandable) {
            return {};
          }
          return {
            collapsed: '',
            'data-expandable': 'true',
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote',
        // Pull quotes also live in <blockquote>; let PullQuoteExtension claim them.
        getAttrs: (element) =>
          (element as HTMLElement).getAttribute('data-type') === 'pullquote' ? false : null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isExp = HTMLAttributes['data-expandable'] === 'true' || HTMLAttributes.expandable !== undefined;
    return [
      'blockquote',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `tiptap-blockquote ${isExp ? 'is-expandable' : ''}`.trim(),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleBlockquote:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
      unsetBlockquote:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
      toggleExpandableBlockquote:
        () =>
        ({ editor, commands }) => {
          const isBlockquote = editor.isActive(this.name);
          if (isBlockquote) {
            const currentExp = !!editor.getAttributes(this.name).expandable;
            return commands.updateAttributes(this.name, { expandable: !currentExp });
          }
          return commands.wrapIn(this.name, { expandable: true });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
    };
  },
});
