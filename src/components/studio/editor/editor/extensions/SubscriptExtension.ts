import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subscript: {
      setSubscript: () => ReturnType;
      toggleSubscript: () => ReturnType;
      unsetSubscript: () => ReturnType;
    };
  }
}

export const SubscriptExtension = Mark.create({
  name: 'subscript',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: 'sub' },
      { tag: 'span[data-subscript="true"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sub',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setSubscript:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSubscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetSubscript:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
