import { Extension } from '@tiptap/core';

/**
 * CodeBlockDoubleReturn extension
 * Implements Telegram iOS codeBlockDoubleReturnExit behavior:
 * - Enter on a trailing blank line exits the code block into a body paragraph below.
 * - Backspace in an empty code block un-codes it to a body paragraph.
 */
export const CodeBlockDoubleReturn = Extension.create({
  name: 'codeBlockDoubleReturn',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive('codeBlock')) {
          return false;
        }

        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const parent = $from.parent;
        const parentOffset = $from.parentOffset;

        // If the code block is completely empty, convert it to a paragraph
        if (parent.content.size === 0) {
          return editor.chain().clearNodes().toggleCodeBlock().run();
        }

        const textBefore = parent.textBetween(0, parentOffset, '\n', '\n');
        const textAfter = parent.textBetween(parentOffset, parent.content.size, '\n', '\n');

        // Check if user pressed Enter on an empty line at the end of the code block
        if (textBefore.endsWith('\n') && textAfter.length === 0) {
          return editor
            .chain()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                // Delete the extra newline that was previously typed
                tr.delete($from.pos - 1, $from.pos);
              }
              return true;
            })
            .exitCode()
            .run();
        }

        return false;
      },

      Backspace: ({ editor }) => {
        if (!editor.isActive('codeBlock')) {
          return false;
        }

        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        // If code block is empty, backspace restores it to normal paragraph
        if ($from.parent.content.size === 0) {
          return editor.chain().clearNodes().setParagraph().run();
        }

        return false;
      },
    };
  },
});
