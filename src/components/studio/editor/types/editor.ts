export type ExportFormat = 'html' | 'markdownv2' | 'entities' | 'plain';

export type PersistenceState = 'idle' | 'saving' | 'saved' | 'error';

export interface TelegramEntity {
  type:
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'spoiler'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'blockquote'
    | 'expandable_blockquote'
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bot_command'
    | 'url'
    | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  language?: string;
  custom_emoji_id?: string;
}

export interface PostMedia {
  id: string;
  type: 'photo' | 'video' | 'audio';
  /** Public URL, or a Telegram file_id for files uploaded from the device. */
  url: string;
  isSpoiler?: boolean;
  /** Set when the file came from the user's device instead of a URL. */
  fileId?: string;
  /** Displayable source for thumbnails (file_id values are not loadable). */
  previewUrl?: string;
  fileName?: string;
}

export interface PostInlineButton {
  id: string;
  text: string;
  url: string;
}

import { PostDocument, InputRichMessage } from './richMessage';

export interface SerializedTelegramPost {
  plainText: string;
  html: string;
  previewHtml?: string;
  /** Classic sendMessage HTML (no h1/table/ul/hr/math). Used only if sendRichMessage fails. */
  fallbackHtml?: string;
  markdownV2: string;
  entities: TelegramEntity[];
  characterCount: number;
  wordCount: number;
  media?: PostMedia[];
  buttons?: PostInlineButton[][];
  document?: PostDocument;
  richMessage?: InputRichMessage;
}

export interface EditorToolbarAction {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  isActive: () => boolean;
  isDisabled?: () => boolean;
  execute: () => void;
}
