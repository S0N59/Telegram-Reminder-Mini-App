export type PostBlockType = 'text' | 'media_gallery' | 'quote' | 'code' | 'file';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface BasePostBlock {
  id: string;
  type: PostBlockType;
}

export interface TextPostBlock extends BasePostBlock {
  type: 'text';
  content: string; // Rich HTML content
}

export interface MediaGalleryPostBlock extends BasePostBlock {
  type: 'media_gallery';
  items: MediaItem[];
  caption: string;
}

export interface QuotePostBlock extends BasePostBlock {
  type: 'quote';
  text: string;
  author?: string;
}

export interface CodePostBlock extends BasePostBlock {
  type: 'code';
  code: string;
  language: string;
}

export interface FilePostBlock extends BasePostBlock {
  type: 'file';
  name: string;
  size: number;
  extension: string;
  url?: string;
}

export type PostBlock =
  | TextPostBlock
  | MediaGalleryPostBlock
  | QuotePostBlock
  | CodePostBlock
  | FilePostBlock;

export interface PostDocument {
  id: string;
  title: string;
  blocks: PostBlock[];
  updatedAt: number;
}

export type ComposerSaveState = 'saved' | 'saving' | 'unsaved' | 'error';

export interface TelegramPostLimits {
  textMax: number; // 4096
  captionMax: number; // 1024
}

export interface SerializedPostOutput {
  plainText: string;
  html: string;
  markdownV2: string;
  characterCount: number;
  captionCharacterCount: number;
  isOverLimit: boolean;
  limitErrorMessage?: string;
  hasMedia: boolean;
  hasFiles: boolean;
  mediaCount: number;
  fileCount: number;
}
