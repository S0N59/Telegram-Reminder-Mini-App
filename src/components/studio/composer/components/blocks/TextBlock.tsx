import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { SpoilerExtension } from '../../../editor/editor/extensions/SpoilerExtension';

interface TextBlockProps {
  id: string;
  content: string;
  onChange: (newContent: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const TextBlock: React.FC<TextBlockProps> = ({
  content,
  onChange,
  placeholder = 'Type / paste content or click + to add media...',
  autoFocus = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      SpoilerExtension,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'composer-text-editor focus:outline-none',
        spellcheck: 'false',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync content from outside if changed
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // only update if drastically different to avoid cursor jumps
      const currentText = editor.getText();
      const temp = document.createElement('div');
      temp.innerHTML = content;
      if (temp.textContent !== currentText) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  return (
    <div className="text-block-container">
      <EditorContent editor={editor} />
    </div>
  );
};
