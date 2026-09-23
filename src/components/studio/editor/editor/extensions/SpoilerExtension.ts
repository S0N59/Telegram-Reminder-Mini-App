import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      setSpoiler: () => ReturnType;
      toggleSpoiler: () => ReturnType;
      unsetSpoiler: () => ReturnType;
    };
  }
}

export const SpoilerExtension = Mark.create({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: 'tg-spoiler' },
      { tag: 'span[data-spoiler="true"]' },
      {
        tag: 'span',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return (element as HTMLElement).classList.contains('tg-spoiler') ? {} : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-spoiler': 'true',
        class: 'editor-spoiler-text'
      }),
      0
    ];
  },

  addCommands() {
    return {
      setSpoiler: () => ({ commands }) => commands.setMark(this.name),
      toggleSpoiler: () => ({ commands }) => commands.toggleMark(this.name),
      unsetSpoiler: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-p': () => this.editor.commands.toggleSpoiler(),
      'Mod-Shift-P': () => this.editor.commands.toggleSpoiler(),
    };
  },
});
