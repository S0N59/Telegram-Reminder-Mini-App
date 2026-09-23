import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tgEmoji: {
      insertTelegramEmoji: (attrs: {
        emojiId: string;
        fallback: string;
        thumbUrl?: string | null;
      }) => ReturnType;
    };
  }
}

export const CustomEmojiExtension = Mark.create({
  name: 'tgEmoji',
  inclusive: false,
  excludes: 'tgEmoji',

  addAttributes() {
    return {
      emojiId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('emoji-id') || element.getAttribute('data-emoji-id'),
        renderHTML: (attrs) =>
          attrs.emojiId
            ? { 'emoji-id': attrs.emojiId, 'data-emoji-id': attrs.emojiId }
            : {},
      },
      fallback: {
        default: '',
      },
      thumbUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-thumb'),
        renderHTML: (attrs) => (attrs.thumbUrl ? { 'data-thumb': attrs.thumbUrl } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'tg-emoji[emoji-id]' },
      { tag: 'span[data-emoji-id]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const thumbUrl = String(HTMLAttributes['data-thumb'] || '');
    const safeThumb = thumbUrl.replace(/[)"'\\]/g, '');
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: safeThumb ? 'editor-tg-emoji has-thumb' : 'editor-tg-emoji',
        style: safeThumb ? `background-image:url("${safeThumb}")` : undefined,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertTelegramEmoji:
        (attrs) =>
        ({ chain }) => {
          const fallback = (attrs.fallback || '▫️').slice(0, 8);
          return chain()
            .focus()
            .insertContent({
              type: 'text',
              text: fallback,
              marks: [
                {
                  type: this.name,
                  attrs: {
                    emojiId: attrs.emojiId,
                    fallback,
                    thumbUrl: attrs.thumbUrl || null,
                  },
                },
              ],
            })
            .run();
        },
    };
  },
});
