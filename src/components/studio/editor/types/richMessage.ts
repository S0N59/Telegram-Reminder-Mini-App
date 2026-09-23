/**
 * Telegram Rich Messages & PostDocument Structured Model
 * Conforms to Telegram Bot API 10.1+ / Rich Messages Specification:
 * - InputRichMessage
 * - InputRichBlock hierarchy
 * - RichText inline spans and marks
 * - PostDocument internal structured representation
 */

// ── Inline Rich Text Styles & Marks ──

export type RichMarkType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'marked' // Highlight
  | 'code'
  | 'subscript'
  | 'superscript'
  | 'custom_emoji'
  | 'math'
  | 'url'
  | 'email'
  | 'phone'
  | 'bank_card'
  | 'mention'
  | 'hashtag'
  | 'cashtag'
  | 'bot_command'
  | 'text_mention'
  | 'date_time'
  | 'footnote_ref';

export interface RichMark {
  type: RichMarkType;
  attrs?: {
    href?: string;
    customEmojiId?: string;
    expression?: string;
    userId?: number;
    username?: string;
    timestamp?: number;
    dateFormat?: string;
    refId?: string;
    [key: string]: any;
  };
}

export interface RichTextSpan {
  text: string;
  marks?: RichMark[];
}

export type RichText = RichTextSpan[];

// ── Block Hierarchy (InputRichBlock) ──

export type InputRichBlockType =
  | 'paragraph'
  | 'sectionHeading'
  | 'preformatted'
  | 'list'
  | 'blockQuotation'
  | 'pullQuotation'
  | 'details'
  | 'table'
  | 'photo'
  | 'video'
  | 'animation'
  | 'audio'
  | 'voiceNote'
  | 'document'
  | 'map'
  | 'collage'
  | 'slideshow'
  | 'mathematicalExpression'
  | 'divider'
  | 'footer'
  | 'reference';

export interface InputRichBlockParagraph {
  _: 'inputRichBlockParagraph';
  text: RichText;
}

export interface InputRichBlockSectionHeading {
  _: 'inputRichBlockSectionHeading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: RichText;
}

export interface InputRichBlockPreformatted {
  _: 'inputRichBlockPreformatted';
  text: RichText;
  language?: string;
}

export interface RichListItem {
  id?: string;
  checked?: boolean; // For checklist
  text: RichText;
  subItems?: RichListItem[];
}

export interface InputRichBlockList {
  _: 'inputRichBlockList';
  style: 'unordered' | 'ordered' | 'checklist';
  items: RichListItem[];
}

export interface InputRichBlockBlockQuotation {
  _: 'inputRichBlockBlockQuotation';
  text: RichText;
  expandable?: boolean;
}

export interface InputRichBlockPullQuotation {
  _: 'inputRichBlockPullQuotation';
  text: RichText;
  caption?: RichText; // Author / citation
}

export interface InputRichBlockDetails {
  _: 'inputRichBlockDetails';
  summary: RichText;
  content: InputRichBlock[];
  isOpen?: boolean;
}

export interface RichTableCell {
  text: RichText;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  rowSpan?: number;
}

export interface InputRichBlockTable {
  _: 'inputRichBlockTable';
  hasHeaderRow?: boolean;
  bordered?: boolean;
  rows: RichTableCell[][];
}

export interface InputRichBlockPhoto {
  _: 'inputRichBlockPhoto';
  url: string;
  caption?: RichText;
  isSpoiler?: boolean;
  width?: number;
  height?: number;
}

export interface InputRichBlockVideo {
  _: 'inputRichBlockVideo';
  url: string;
  caption?: RichText;
  isSpoiler?: boolean;
  duration?: number;
  width?: number;
  height?: number;
}

export interface InputRichBlockAnimation {
  _: 'inputRichBlockAnimation';
  url: string;
  caption?: RichText;
  isSpoiler?: boolean;
  width?: number;
  height?: number;
}

export interface InputRichBlockAudio {
  _: 'inputRichBlockAudio';
  url: string;
  caption?: RichText;
  title?: string;
  performer?: string;
  duration?: number;
}

export interface InputRichBlockVoiceNote {
  _: 'inputRichBlockVoiceNote';
  url: string;
  caption?: RichText;
  duration?: number;
}

export interface InputRichBlockDocument {
  _: 'inputRichBlockDocument';
  url: string;
  filename?: string;
  caption?: RichText;
}

export interface InputRichBlockMap {
  _: 'inputRichBlockMap';
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
}

export interface InputRichBlockCollage {
  _: 'inputRichBlockCollage';
  items: (InputRichBlockPhoto | InputRichBlockVideo)[];
}

export interface InputRichBlockSlideshow {
  _: 'inputRichBlockSlideshow';
  items: (InputRichBlockPhoto | InputRichBlockVideo)[];
}

export interface InputRichBlockMathematicalExpression {
  _: 'inputRichBlockMathematicalExpression';
  expression: string;
  isBlock: boolean;
}

export interface InputRichBlockDivider {
  _: 'inputRichBlockDivider';
}

export interface InputRichBlockFooter {
  _: 'inputRichBlockFooter';
  text: RichText;
}

export interface InputRichBlockReference {
  _: 'inputRichBlockReference';
  id: string;
  label: string;
  url?: string;
  text?: RichText;
}

export type InputRichBlock =
  | InputRichBlockParagraph
  | InputRichBlockSectionHeading
  | InputRichBlockPreformatted
  | InputRichBlockList
  | InputRichBlockBlockQuotation
  | InputRichBlockPullQuotation
  | InputRichBlockDetails
  | InputRichBlockTable
  | InputRichBlockPhoto
  | InputRichBlockVideo
  | InputRichBlockAnimation
  | InputRichBlockAudio
  | InputRichBlockVoiceNote
  | InputRichBlockDocument
  | InputRichBlockMap
  | InputRichBlockCollage
  | InputRichBlockSlideshow
  | InputRichBlockMathematicalExpression
  | InputRichBlockDivider
  | InputRichBlockFooter
  | InputRichBlockReference;

// ── Top-Level Models ──

export interface PostDocumentMeta {
  title?: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
  rtl?: boolean;
}

export interface PostDocument {
  version: '1.0';
  meta?: PostDocumentMeta;
  blocks: InputRichBlock[];
  attachedMedia?: any[];
  buttons?: any[][];
}

export interface InputRichMessage {
  _: 'inputRichMessage';
  blocks: InputRichBlock[];
  reply_markup?: {
    inline_keyboard?: any[][];
  };
}
