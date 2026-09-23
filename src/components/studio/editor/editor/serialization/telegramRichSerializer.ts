/**
 * Telegram Rich Message Serializer
 * Directly converts Tiptap ProseMirror JSON AST to Telegram Bot API 10.1+ Rich Message format:
 * PostDocument -> InputRichBlock[] -> RichText[] -> InputRichMessage
 */

import {
  PostDocument,
  InputRichMessage,
  InputRichBlock,
  RichText,
  RichTextSpan,
  RichMark,
  InputRichBlockParagraph,
  InputRichBlockSectionHeading,
  InputRichBlockPreformatted,
  InputRichBlockBlockQuotation,
  InputRichBlockPullQuotation,
  InputRichBlockDetails,
  InputRichBlockList,
  InputRichBlockTable,
  InputRichBlockDivider,
  InputRichBlockMap,
  InputRichBlockMathematicalExpression,
  InputRichBlockReference,
  InputRichBlockPhoto,
  InputRichBlockVideo,
  InputRichBlockAudio,
  InputRichBlockCollage,
  RichListItem,
  RichTableCell,
} from '../../types/richMessage';

interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: Record<string, any>;
}

/**
 * Converts Tiptap inline content to structured Telegram RichText spans
 */
export function serializeInlineToRichText(nodes?: TiptapNode[]): RichText {
  if (!nodes || nodes.length === 0) return [];

  const spans: RichTextSpan[] = [];

  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      spans.push({ text: '\n', marks: [] });
      continue;
    }

    const text = node.text || '';
    if (!text) continue;

    const marks: RichMark[] = [];
    const tiptapMarks = node.marks || [];

    for (const m of tiptapMarks) {
      switch (m.type) {
        case 'bold':
          marks.push({ type: 'bold' });
          break;
        case 'italic':
          marks.push({ type: 'italic' });
          break;
        case 'underline':
          marks.push({ type: 'underline' });
          break;
        case 'strike':
          marks.push({ type: 'strikethrough' });
          break;
        case 'spoiler':
          marks.push({ type: 'spoiler' });
          break;
        case 'highlight':
          marks.push({ type: 'marked' });
          break;
        case 'code':
          marks.push({ type: 'code' });
          break;
        case 'subscript':
          marks.push({ type: 'subscript' });
          break;
        case 'superscript':
          marks.push({ type: 'superscript' });
          break;
        case 'link': {
          const href = m.attrs?.href || '';
          if (href.startsWith('tg://user?id=')) {
            const userId = parseInt(href.replace('tg://user?id=', ''), 10);
            marks.push({ type: 'text_mention', attrs: { userId } });
          } else if (href.startsWith('tg://time?t=')) {
            const timestamp = parseInt(href.replace('tg://time?t=', ''), 10);
            marks.push({ type: 'date_time', attrs: { timestamp } });
          } else {
            marks.push({ type: 'url', attrs: { href } });
          }
          break;
        }
        case 'referenceMark': {
          const refId = m.attrs?.refId || '1';
          marks.push({ type: 'footnote_ref', attrs: { refId } });
          break;
        }
        case 'tgEmoji': {
          const customEmojiId = m.attrs?.emojiId;
          if (customEmojiId) {
            marks.push({ type: 'custom_emoji', attrs: { customEmojiId } });
          }
          break;
        }
      }
    }

    // Auto-detect Telegram entities in text if no explicit link mark was set
    const hasLinkMark = marks.some((mk) => mk.type === 'url' || mk.type === 'text_mention');
    if (!hasLinkMark) {
      if (/^@[a-zA-Z0-9_]{3,32}$/.test(text.trim())) {
        marks.push({ type: 'mention', attrs: { username: text.trim() } });
      } else if (/^#[a-zA-Z0-9_\u0400-\u04FF]{1,64}$/.test(text.trim())) {
        marks.push({ type: 'hashtag' });
      } else if (/^\$[A-Z]{1,8}$/.test(text.trim())) {
        marks.push({ type: 'cashtag' });
      } else if (/^\/[a-zA-Z0-9_]{1,64}/.test(text.trim())) {
        marks.push({ type: 'bot_command' });
      } else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text.trim())) {
        marks.push({ type: 'email', attrs: { email: text.trim() } });
      }
    }

    spans.push({ text, marks });
  }

  return spans;
}

/**
 * Converts Tiptap JSON AST to structured PostDocument
 */
export function tiptapToPostDocument(
  docJSON: TiptapNode,
  attachedMedia: any[] = [],
  buttons: any[][] = []
): PostDocument {
  const blocks: InputRichBlock[] = [];

  if (!docJSON || !docJSON.content) {
    return {
      version: '1.0',
      blocks: [],
      attachedMedia,
      buttons,
    };
  }

  // 1. Process block nodes
  for (const node of docJSON.content) {
    switch (node.type) {
      case 'paragraph': {
        const text = serializeInlineToRichText(node.content);
        // Check for standalone LaTeX math in paragraph ($$ formula $$)
        const plain = text.map((t) => t.text).join('').trim();
        const mathMatch = plain.match(/^\$\$([\s\S]+)\$\$$/);
        if (mathMatch) {
          blocks.push({
            _: 'inputRichBlockMathematicalExpression',
            expression: mathMatch[1].trim(),
            isBlock: true,
          } as InputRichBlockMathematicalExpression);
        } else {
          blocks.push({
            _: 'inputRichBlockParagraph',
            text,
          } as InputRichBlockParagraph);
        }
        break;
      }

      case 'heading': {
        const level = (node.attrs?.level || 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const text = serializeInlineToRichText(node.content);
        blocks.push({
          _: 'inputRichBlockSectionHeading',
          level,
          text,
        } as InputRichBlockSectionHeading);
        break;
      }

      case 'codeBlock': {
        const language = node.attrs?.language || undefined;
        const text = serializeInlineToRichText(node.content);
        blocks.push({
          _: 'inputRichBlockPreformatted',
          language,
          text,
        } as InputRichBlockPreformatted);
        break;
      }

      case 'blockquote': {
        const isExpandable = !!node.attrs?.expandable;
        const isPullQuote = node.attrs?.['data-type'] === 'pullquote';

        // Flatten inner paragraph blocks into RichText
        const innerSpans: RichTextSpan[] = [];
        if (node.content) {
          for (const inner of node.content) {
            const innerText = serializeInlineToRichText(inner.content);
            innerSpans.push(...innerText);
          }
        }

        if (isPullQuote) {
          blocks.push({
            _: 'inputRichBlockPullQuotation',
            text: innerSpans,
            caption: node.attrs?.author
              ? [{ text: node.attrs.author, marks: [{ type: 'italic' }] }]
              : undefined,
          } as InputRichBlockPullQuotation);
        } else {
          blocks.push({
            _: 'inputRichBlockBlockQuotation',
            text: innerSpans,
            expandable: isExpandable,
          } as InputRichBlockBlockQuotation);
        }
        break;
      }

      case 'pullQuote': {
        const innerSpans: RichTextSpan[] = [];
        if (node.content) {
          for (const inner of node.content) {
            const innerText = serializeInlineToRichText(inner.content);
            innerSpans.push(...innerText);
          }
        }
        blocks.push({
          _: 'inputRichBlockPullQuotation',
          text: innerSpans,
          caption: node.attrs?.author
            ? [{ text: node.attrs.author, marks: [{ type: 'italic' }] }]
            : undefined,
        } as InputRichBlockPullQuotation);
        break;
      }

      case 'detailsBlock': {
        const summaryText: RichText = [{ text: node.attrs?.title || 'Show me more', marks: [] }];
        const innerBlocks: InputRichBlock[] = [];
        if (node.content) {
          const subDoc = tiptapToPostDocument({ type: 'doc', content: node.content });
          innerBlocks.push(...subDoc.blocks);
        }
        blocks.push({
          _: 'inputRichBlockDetails',
          summary: summaryText,
          content: innerBlocks,
          isOpen: !!node.attrs?.open,
        } as InputRichBlockDetails);
        break;
      }

      case 'bulletList':
      case 'orderedList': {
        const style = node.type === 'orderedList' ? 'ordered' : 'unordered';
        const items: RichListItem[] = [];

        if (node.content) {
          for (const itemNode of node.content) {
            if (itemNode.type === 'listItem') {
              const itemSpans: RichTextSpan[] = [];
              if (itemNode.content) {
                for (const inner of itemNode.content) {
                  itemSpans.push(...serializeInlineToRichText(inner.content));
                }
              }
              items.push({ text: itemSpans });
            }
          }
        }

        blocks.push({
          _: 'inputRichBlockList',
          style,
          items,
        } as InputRichBlockList);
        break;
      }

      case 'taskList': {
        const items: RichListItem[] = [];
        if (node.content) {
          for (const itemNode of node.content) {
            if (itemNode.type === 'taskItem') {
              const checked = !!itemNode.attrs?.checked;
              const itemSpans: RichTextSpan[] = [];
              if (itemNode.content) {
                for (const inner of itemNode.content) {
                  itemSpans.push(...serializeInlineToRichText(inner.content));
                }
              }
              items.push({ text: itemSpans, checked });
            }
          }
        }

        blocks.push({
          _: 'inputRichBlockList',
          style: 'checklist',
          items,
        } as InputRichBlockList);
        break;
      }

      case 'table': {
        const rows: RichTableCell[][] = [];
        if (node.content) {
          for (const rowNode of node.content) {
            if (rowNode.type === 'tableRow' && rowNode.content) {
              const cells: RichTableCell[] = [];
              for (const cellNode of rowNode.content) {
                const isHeader = cellNode.type === 'tableHeader';
                const cellSpans: RichTextSpan[] = [];
                if (cellNode.content) {
                  for (const inner of cellNode.content) {
                    cellSpans.push(...serializeInlineToRichText(inner.content));
                  }
                }
                cells.push({
                  text: cellSpans,
                  isHeader,
                  colSpan: cellNode.attrs?.colspan || 1,
                  rowSpan: cellNode.attrs?.rowspan || 1,
                });
              }
              rows.push(cells);
            }
          }
        }

        blocks.push({
          _: 'inputRichBlockTable',
          hasHeaderRow: rows.length > 0 && rows[0].some((c) => c.isHeader),
          bordered: true,
          rows,
        } as InputRichBlockTable);
        break;
      }

      case 'horizontalRule': {
        blocks.push({
          _: 'inputRichBlockDivider',
        } as InputRichBlockDivider);
        break;
      }

      case 'mathBlock': {
        blocks.push({
          _: 'inputRichBlockMathematicalExpression',
          expression: node.attrs?.formula || '',
          isBlock: true,
        } as InputRichBlockMathematicalExpression);
        break;
      }

      case 'mapBlock': {
        blocks.push({
          _: 'inputRichBlockMap',
          latitude: node.attrs?.latitude ?? 40.7128,
          longitude: node.attrs?.longitude ?? -74.006,
          title: node.attrs?.title || 'Location Pin',
          address: node.attrs?.address || undefined,
        } as InputRichBlockMap);
        break;
      }

      case 'referenceBlock': {
        blocks.push({
          _: 'inputRichBlockReference',
          id: node.attrs?.id || '1',
          label: node.attrs?.label || '[1]',
          url: node.attrs?.url || undefined,
          text: [{ text: node.attrs?.text || '', marks: [] }],
        } as InputRichBlockReference);
        break;
      }
    }
  }

  // 2. Attach media blocks
  if (attachedMedia && attachedMedia.length > 0) {
    if (attachedMedia.length === 1) {
      const m = attachedMedia[0];
      if (m.type === 'photo') {
        blocks.unshift({
          _: 'inputRichBlockPhoto',
          url: m.url,
          isSpoiler: m.isSpoiler,
        } as InputRichBlockPhoto);
      } else if (m.type === 'video') {
        blocks.unshift({
          _: 'inputRichBlockVideo',
          url: m.url,
          isSpoiler: m.isSpoiler,
        } as InputRichBlockVideo);
      } else if (m.type === 'audio') {
        blocks.unshift({
          _: 'inputRichBlockAudio',
          url: m.url,
        } as InputRichBlockAudio);
      }
    } else {
      // Collage for 2+ media items
      const items: (InputRichBlockPhoto | InputRichBlockVideo)[] = attachedMedia
        .filter((m) => m.type === 'photo' || m.type === 'video')
        .map((m) => {
          if (m.type === 'video') {
            return {
              _: 'inputRichBlockVideo',
              url: m.url,
              isSpoiler: m.isSpoiler,
            } as InputRichBlockVideo;
          }
          return {
            _: 'inputRichBlockPhoto',
            url: m.url,
            isSpoiler: m.isSpoiler,
          } as InputRichBlockPhoto;
        });

      if (items.length > 0) {
        blocks.unshift({
          _: 'inputRichBlockCollage',
          items,
        } as InputRichBlockCollage);
      }
    }
  }

  return {
    version: '1.0',
    blocks,
    attachedMedia,
    buttons,
  };
}

/**
 * Converts PostDocument to Telegram Bot API InputRichMessage
 */
export function postDocumentToInputRichMessage(doc: PostDocument): InputRichMessage {
  const richMsg: InputRichMessage = {
    _: 'inputRichMessage',
    blocks: doc.blocks,
  };

  if (doc.buttons && doc.buttons.length > 0) {
    richMsg.reply_markup = {
      inline_keyboard: doc.buttons.map((row) =>
        row.map((btn) => ({
          text: btn.text,
          url: btn.url,
        }))
      ),
    };
  }

  return richMsg;
}
