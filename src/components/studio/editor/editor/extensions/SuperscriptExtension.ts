import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    superscript: {
      setSuperscript: () => ReturnType;
      toggleSuperscript: () => ReturnType;
      unsetSuperscript: () => ReturnType;
    };
  }
}

export const SuperscriptExtension = Mark.create({
  name: 'superscript',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: 'sup' },
      { tag: 'span[data-superscript="true"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setSuperscript:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSuperscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetSuperscript:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
