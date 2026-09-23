import { TelegramEntity, SerializedTelegramPost, PostMedia, PostInlineButton } from '../../types/editor';
import { tiptapToPostDocument, postDocumentToInputRichMessage } from './telegramRichSerializer';

// Escape characters for Telegram HTML
export function escapeTelegramHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape characters for Telegram MarkdownV2
// Characters: '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
export function escapeTelegramMarkdownV2(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

interface Mark {
  type: string;
  attrs?: Record<string, any>;
}

interface NodeJSON {
  type: string;
  text?: string;
  marks?: Mark[];
  content?: NodeJSON[];
  attrs?: Record<string, any>;
}

/**
 * Traverses Tiptap/ProseMirror JSON document and converts it to:
 * 1. Valid Telegram HTML
 * 2. Valid Telegram MarkdownV2
 * 3. Telegram Message Entities (UTF-16 code unit offsets)
 * 4. Plain text & word/char counts
 */
export function serializeTelegramDoc(
  doc: NodeJSON,
  media: PostMedia[] = [],
  buttons: PostInlineButton[][] = []
): SerializedTelegramPost {
  const document = tiptapToPostDocument(doc, media, buttons);
  const richMessage = postDocumentToInputRichMessage(document);

  if (!doc || !doc.content) {
    return {
      plainText: '',
      html: '',
      previewHtml: '',
      fallbackHtml: '',
      markdownV2: '',
      entities: [],
      characterCount: 0,
      wordCount: 0,
      media,
      buttons,
      document,
      richMessage,
    };
  }

  let plainTextAcc = '';
  let htmlAcc = '';
  let previewHtmlAcc = '';
  let fallbackHtmlAcc = '';
  let markdownV2Acc = '';
  let detailsPreviewIndex = 0;
  const entities: TelegramEntity[] = [];

  const emit = (rich: string, fallback: string, preview = rich) => {
    htmlAcc += rich;
    fallbackHtmlAcc += fallback;
    previewHtmlAcc += preview;
  };

  function processBlocks(blocks: NodeJSON[], isInsideQuote = false) {
    blocks.forEach((block, blockIndex) => {
      if (block.type === 'paragraph') {
        let blockHtml = '';
        let blockFallback = '';
        let blockMd = '';
        let blockPreview = '';

        if (block.content && block.content.length > 0) {
          block.content.forEach((inlineNode) => {
            const res = processInline(inlineNode);
            blockHtml += res.html;
            blockFallback += res.fallback;
            blockMd += res.md;
            blockPreview += res.preview;
          });
        }

        emit(`<p>${blockHtml || '<br>'}</p>`, blockFallback ? `${blockFallback}\n\n` : '', `<p>${blockPreview || '<br>'}</p>`);
        markdownV2Acc += isInsideQuote ? blockMd : `${blockMd}\n\n`;

        if (blockIndex < blocks.length - 1) {
          plainTextAcc += '\n';
        }
      } else if (block.type === 'blockquote') {
        const quoteStartOffset = plainTextAcc.length;
        const isExpandable = !!block.attrs?.expandable;
        let quoteInnerHtml = '';
        let quoteInnerFallback = '';
        let quoteInnerPreview = '';
        let quoteMd = '';

        if (block.content) {
          block.content.forEach((innerBlock, innerIdx) => {
            if (innerIdx > 0) {
              quoteInnerHtml += '<br>';
              quoteInnerFallback += '\n';
              quoteInnerPreview += '<br>';
              quoteMd += '\n';
            }
            if (innerBlock.content) {
              innerBlock.content.forEach((inlineNode) => {
                const res = processInline(inlineNode);
                quoteInnerHtml += res.html;
                quoteInnerFallback += res.fallback;
                quoteInnerPreview += res.preview;
                quoteMd += res.md;
              });
            }
          });
        }
        const openTag = isExpandable ? '<blockquote collapsed>' : '<blockquote>';
        emit(`${openTag}${quoteInnerHtml}</blockquote>`, `${openTag}${quoteInnerFallback}</blockquote>\n`, `${openTag}${quoteInnerPreview}</blockquote>`);

        // In MarkdownV2, quote lines are prefixed with >
        // Telegram Bot API 7.3+ supports expandable blockquotes via **>line1\n>line2**
        const quoteLines = quoteMd.split('\n').map((l) => `>${l}`).join('\n');
        if (isExpandable) {
          markdownV2Acc += `**${quoteLines}**\n\n`;
        } else {
          markdownV2Acc += `${quoteLines}\n\n`;
        }

        const quoteLength = plainTextAcc.length - quoteStartOffset;
        if (quoteLength > 0) {
          entities.push({
            type: isExpandable ? 'expandable_blockquote' : 'blockquote',
            offset: quoteStartOffset,
            length: quoteLength
          });
        }

        if (blockIndex < blocks.length - 1) {
          plainTextAcc += '\n';
        }
      } else if (block.type === 'codeBlock') {
        const codeStartOffset = plainTextAcc.length;
        const rawCode = block.content?.map((c) => c.text || '').join('') || '';
        const lang = block.attrs?.language || '';

        plainTextAcc += rawCode;
        const codeLength = rawCode.length;

        const escapedHtmlCode = escapeTelegramHTML(rawCode);
        const langAttr = lang ? ` class="language-${lang}"` : '';
        const codeTag = `<pre><code${langAttr}>${escapedHtmlCode}</code></pre>`;
        emit(codeTag, `${codeTag}\n`);

        markdownV2Acc += `\`\`\`${lang}\n${rawCode}\n\`\`\`\n\n`;

        if (codeLength > 0) {
          entities.push({
            type: 'pre',
            offset: codeStartOffset,
            length: codeLength,
            ...(lang ? { language: lang } : {})
          });
        }

        if (blockIndex < blocks.length - 1) {
          plainTextAcc += '\n';
        }
      } else if (block.type === 'bulletList' || block.type === 'orderedList') {
        const isOrdered = block.type === 'orderedList';
        const listTag = isOrdered ? 'ol' : 'ul';
        let listItemsHtml = '';
        let listFallback = '';

        block.content?.forEach((itemNode, itemIdx) => {
          if (itemNode.type === 'listItem') {
            const prefix = isOrdered ? `${itemIdx + 1}. ` : '• ';
            plainTextAcc += prefix;
            markdownV2Acc += `${escapeTelegramMarkdownV2(prefix)}`;
            listFallback += prefix;

            let itemContentHtml = '';
            itemNode.content?.forEach((innerBlock) => {
              if (innerBlock.content) {
                innerBlock.content.forEach((inlineNode) => {
                  const res = processInline(inlineNode);
                  itemContentHtml += res.html;
                  listFallback += res.fallback;
                  markdownV2Acc += res.md;
                });
              }
            });

            listItemsHtml += `<li>${itemContentHtml}</li>`;
            listFallback += '\n';
            plainTextAcc += '\n';
            markdownV2Acc += '\n';
          }
        });

        emit(`<${listTag}>${listItemsHtml}</${listTag}>`, `${listFallback}\n`);
        markdownV2Acc += '\n';
      } else if (block.type === 'heading') {
        const level = block.attrs?.level || 1;
        const headingStartOffset = plainTextAcc.length;
        let headingHtml = '';
        let headingFallback = '';
        let headingMd = '';
        let headingPreview = '';

        block.content?.forEach((inlineNode) => {
          const res = processInline(inlineNode);
          headingHtml += res.html;
          headingFallback += res.fallback;
          headingMd += res.md;
          headingPreview += res.preview;
        });

        const headingLength = plainTextAcc.length - headingStartOffset;
        if (headingLength > 0) {
          // Register bold entity for heading for entity-based consumers
          entities.push({
            type: 'bold',
            offset: headingStartOffset,
            length: headingLength,
          });
        }

        const safeLevel = Math.min(6, Math.max(1, level));
        emit(
          `<h${safeLevel}>${headingHtml}</h${safeLevel}>`,
          `<b>${headingFallback}</b>\n\n`,
          `<h${safeLevel} class="tg-preview-heading tg-h${safeLevel}">${headingPreview}</h${safeLevel}>`
        );
        markdownV2Acc += `${'#'.repeat(safeLevel)} ${headingMd}\n\n`;

        plainTextAcc += '\n\n';
      } else if (block.type === 'taskList') {
        let taskItemsHtml = '';
        let taskFallback = '';
        let taskPreview = '';
        block.content?.forEach((itemNode) => {
          if (itemNode.type === 'taskItem') {
            const checked = !!itemNode.attrs?.checked;
            const prefix = checked ? '☑ ' : '☐ ';
            plainTextAcc += prefix;
            markdownV2Acc += checked ? '- [x] ' : '- [ ] ';
            taskFallback += prefix;

            let itemContentHtml = '';
            let itemPreview = '';
            itemNode.content?.forEach((innerBlock) => {
              if (innerBlock.content) {
                innerBlock.content.forEach((inlineNode) => {
                  const res = processInline(inlineNode);
                  itemContentHtml += res.html;
                  itemPreview += res.preview;
                  taskFallback += res.fallback;
                  markdownV2Acc += res.md;
                });
              }
            });

            // Official Rich HTML (Bot API): <li><input type="checkbox" checked>text</li>
            taskItemsHtml += `<li><input type="checkbox"${checked ? ' checked' : ''}>${itemContentHtml}</li>`;
            taskPreview += `<li class="tg-preview-check${checked ? ' is-checked' : ''}"><span class="tg-check-box" aria-hidden="true"></span><span>${itemPreview}</span></li>`;
            taskFallback += '\n';
            plainTextAcc += '\n';
            markdownV2Acc += '\n';
          }
        });

        emit(
          `<ul>${taskItemsHtml}</ul>`,
          `${taskFallback}\n`,
          `<ul class="tg-preview-task-list">${taskPreview}</ul>`
        );
        markdownV2Acc += '\n';
      } else if (block.type === 'table') {
        const rowsText: string[][] = [];
        let tableRowsHtml = '';

        block.content?.forEach((rowNode) => {
          if (rowNode.type === 'tableRow') {
            const rowCells: string[] = [];
            let rowHtml = '';

            rowNode.content?.forEach((cellNode) => {
              let cellPlain = '';
              let cellHtml = '';

              cellNode.content?.forEach((innerBlock) => {
                if (innerBlock.content) {
                  innerBlock.content.forEach((inlineNode) => {
                    const res = processInline(inlineNode);
                    cellPlain += res.html.replace(/<[^>]+>/g, '');
                    cellHtml += res.html;
                  });
                }
              });

              rowCells.push(cellPlain.trim() || ' ');
              const cellTag = cellNode.type === 'tableHeader' ? 'th' : 'td';
              rowHtml += `<${cellTag}>${cellHtml || '&nbsp;'}</${cellTag}>`;
            });

            rowsText.push(rowCells);
            tableRowsHtml += `<tr>${rowHtml}</tr>`;
          }
        });

        if (rowsText.length > 0) {
          const colWidths = rowsText[0].map((_, colIdx) =>
            Math.max(...rowsText.map((row) => (row[colIdx] || '').length), 3)
          );

          let tableStr = '';
          rowsText.forEach((row, rIdx) => {
            const line = row
              .map((cell, cIdx) => cell.padEnd(colWidths[cIdx], ' '))
              .join(' | ');
            tableStr += line + '\n';
            plainTextAcc += line + '\n';

            if (rIdx === 0) {
              const divider = colWidths.map((w) => '-'.repeat(w)).join('-+-');
              tableStr += divider + '\n';
            }
          });

          const richTable = `<table bordered>${tableRowsHtml}</table>`;
          const fallbackTable = tableStr.trim()
            ? `<pre>${escapeTelegramHTML(tableStr.trim())}</pre>\n\n`
            : '';
          emit(richTable, fallbackTable);

          const colCount = Math.max(...rowsText.map((r) => r.length));
          rowsText.forEach((row, rIdx) => {
            const rowStr = '| ' + row.map((c) => escapeTelegramMarkdownV2(c)).join(' | ') + ' |';
            markdownV2Acc += rowStr + '\n';
            if (rIdx === 0) {
              markdownV2Acc += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
            }
          });
          markdownV2Acc += '\n';
          plainTextAcc += '\n';
        }
      } else if (block.type === 'horizontalRule') {
        emit('<hr/>', '----------------------------------------\n\n');
        plainTextAcc += '----------------------------------------\n\n';
        markdownV2Acc += '---\n\n';
      } else if (block.type === 'pullQuote') {
        const inners = block.content || [];
        const authorBlocks = inners.length > 1 ? inners.slice(-1) : [];
        const quoteBlocks = inners.length > 1 ? inners.slice(0, -1) : inners;

        const joinInners = (nodes: NodeJSON[]) => {
          let html = '';
          let fallback = '';
          let md = '';
          let preview = '';
          nodes.forEach((innerBlock, innerIdx) => {
            if (innerIdx > 0) {
              html += '<br>';
              fallback += '\n';
              preview += '<br>';
              md += '\n';
            }
            innerBlock.content?.forEach((inlineNode) => {
              const res = processInline(inlineNode);
              html += res.html;
              fallback += res.fallback;
              preview += res.preview;
              md += res.md;
            });
          });
          return { html, fallback, md, preview };
        };

        const quote = joinInners(quoteBlocks);
        const authorBits = joinInners(authorBlocks);
        const author = (authorBits.fallback || block.attrs?.author || '').replace(/<[^>]+>/g, '').trim();
        const cite = author ? `<cite>${escapeTelegramHTML(author)}</cite>` : '';
        const authorFallback = author ? `<br><i>— ${escapeTelegramHTML(author)}</i>` : '';
        emit(
          `<aside><p>${quote.html}</p>${cite}</aside>`,
          `<blockquote>${quote.fallback}${authorFallback}</blockquote>\n\n`,
          `<aside class="tg-preview-pullquote">${quote.preview}${cite}</aside>`
        );
        markdownV2Acc += `>${quote.md}${author ? `\n>_${escapeTelegramMarkdownV2(author)}_` : ''}\n\n`;
        plainTextAcc += `"${quote.html.replace(/<[^>]+>/g, '')}"${author ? ` — ${author}` : ''}\n\n`;
      } else if (block.type === 'detailsBlock') {
        const detailBlocks = block.content || [];
        const titleFromFirst = (() => {
          const first = detailBlocks[0];
          if (!first?.content) return '';
          return first.content.map((n) => n.text || '').join('').trim();
        })();
        const title = titleFromFirst || block.attrs?.title || 'Show me more';
        const bodyBlocks = titleFromFirst ? detailBlocks.slice(1) : detailBlocks;
        let innerHtml = '';
        let innerFallback = '';
        let innerMd = '';
        let innerPreview = '';

        bodyBlocks.forEach((innerBlock, innerIdx) => {
          if (innerIdx > 0) {
            innerFallback += '\n';
            innerMd += '\n';
          }
          let pieceHtml = '';
          let piecePreview = '';
          innerBlock.content?.forEach((inlineNode) => {
            const res = processInline(inlineNode);
            pieceHtml += res.html;
            piecePreview += res.preview;
            innerFallback += res.fallback;
            innerMd += res.md;
          });
          innerHtml += `<p>${pieceHtml || '<br>'}</p>`;
          if (innerIdx > 0) innerPreview += '<br>';
          innerPreview += piecePreview;
        });

        const titleEsc = escapeTelegramHTML(title);
        emit(
          `<details><summary>${titleEsc}</summary>${innerHtml}</details>`,
          `<b>${titleEsc}</b>\n${innerFallback}\n\n`,
          `<div class="tg-preview-details-block" data-details-idx="${detailsPreviewIndex++}"><div class="tg-details-summary">${titleEsc}</div><div class="tg-details-body">${innerPreview}</div></div>`
        );
        markdownV2Acc += `**>${escapeTelegramMarkdownV2(title)}\n>${escapeTelegramMarkdownV2(innerMd)}**\n\n`;
        plainTextAcc += `[${title}]\n${innerHtml.replace(/<[^>]+>/g, '')}\n\n`;
      } else if (block.type === 'mathBlock') {
        const formula = block.attrs?.formula || '';
        const escapedFormula = escapeTelegramHTML(formula);
        emit(
          `<tg-math-block>${escapedFormula}</tg-math-block>`,
          `<pre><code>${escapedFormula}</code></pre>\n\n`,
          `<tg-math-block>${escapedFormula}</tg-math-block>`
        );
        markdownV2Acc += `$$${formula}$$\n\n`;
        plainTextAcc += `[Math: ${formula}]\n\n`;
      } else if (block.type === 'mapBlock') {
        const lat = block.attrs?.latitude ?? 40.7128;
        const lng = block.attrs?.longitude ?? -74.006;
        const title = block.attrs?.title || 'Location Pin';
        const address = block.attrs?.address || '';
        const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const caption = address
          ? `${escapeTelegramHTML(title)} — ${escapeTelegramHTML(address)}`
          : escapeTelegramHTML(title);

        emit(
          `<tg-map latitude="${lat}" longitude="${lng}"><figcaption>${caption}</figcaption></tg-map>`,
          `📍 <b>${escapeTelegramHTML(title)}</b>${address ? `\n<i>${escapeTelegramHTML(address)}</i>` : ''}\n${mapUrl}\n\n`,
          `<tg-map class="tg-preview-map" latitude="${lat}" longitude="${lng}"><div class="tg-map-badge">📍 ${escapeTelegramHTML(title)}</div><div class="tg-map-meta">${address ? `${escapeTelegramHTML(address)} • ` : ''}Lat: ${lat}, Long: ${lng}</div></tg-map>`
        );
        markdownV2Acc += `📍 *${escapeTelegramMarkdownV2(title)}* (${lat}, ${lng})\n\n`;
        plainTextAcc += `📍 ${title} (${lat}, ${lng})\n\n`;
      } else if (block.type === 'referenceBlock') {
        const label = block.attrs?.label || '[1]';
        const text = block.attrs?.text || '';
        const url = block.attrs?.url || '';
        const refName = String(block.attrs?.id || block.attrs?.refId || '1').replace(/[^a-zA-Z0-9_-]/g, '');
        const refBody = `${escapeTelegramHTML(text)}${url ? ` <a href="${url}">[link]</a>` : ''}`;

        emit(
          `<tg-reference name="${refName}">${escapeTelegramHTML(label)} ${refBody}</tg-reference>`,
          `<b>${escapeTelegramHTML(label)}</b> ${escapeTelegramHTML(text)}${url ? ` <a href="${url}">[link]</a>` : ''}\n\n`,
          `<aside class="tg-preview-footnote"><span class="tg-footnote-quote">${escapeTelegramHTML(text)}</span></aside>`
        );
        markdownV2Acc += `${escapeTelegramMarkdownV2(label)} ${escapeTelegramMarkdownV2(text)}${url ? ` [link](${url})` : ''}\n\n`;
        plainTextAcc += `${label} ${text}${url ? ` (${url})` : ''}\n\n`;
      }
    });
  }

  function processInline(node: NodeJSON): { html: string; fallback: string; md: string; preview: string } {
    if (node.type === 'hardBreak') {
      plainTextAcc += '\n';
      return { html: '<br>', fallback: '\n', md: '\n', preview: '<br>' };
    }

    const text = node.text || '';
    if (!text) return { html: '', fallback: '', md: '', preview: '' };

    const offset = plainTextAcc.length;
    const length = text.length; // UTF-16 code units
    plainTextAcc += text;

    const marks = node.marks || [];
    let inlineHtml = escapeTelegramHTML(text);
    let inlineFallback = inlineHtml;
    let inlinePreview = inlineHtml;
    let inlineMd = escapeTelegramMarkdownV2(text);

    // Sort marks to ensure consistent nesting
    // Sequence: link -> spoiler -> strike -> underline -> italic -> bold -> code
    marks.forEach((mark) => {
      switch (mark.type) {
        case 'bold':
          inlineHtml = `<b>${inlineHtml}</b>`;
          inlineFallback = `<b>${inlineFallback}</b>`;
          inlinePreview = `<b>${inlinePreview}</b>`;
          inlineMd = `*${inlineMd}*`;
          entities.push({ type: 'bold', offset, length });
          break;
        case 'italic':
          inlineHtml = `<i>${inlineHtml}</i>`;
          inlineFallback = `<i>${inlineFallback}</i>`;
          inlinePreview = `<i>${inlinePreview}</i>`;
          inlineMd = `_${inlineMd}_`;
          entities.push({ type: 'italic', offset, length });
          break;
        case 'underline':
          inlineHtml = `<u>${inlineHtml}</u>`;
          inlineFallback = `<u>${inlineFallback}</u>`;
          inlinePreview = `<u>${inlinePreview}</u>`;
          inlineMd = `__${inlineMd}__`;
          entities.push({ type: 'underline', offset, length });
          break;
        case 'strike':
          inlineHtml = `<s>${inlineHtml}</s>`;
          inlineFallback = `<s>${inlineFallback}</s>`;
          inlinePreview = `<s>${inlinePreview}</s>`;
          inlineMd = `~${inlineMd}~`;
          entities.push({ type: 'strikethrough', offset, length });
          break;
        case 'spoiler':
          inlineHtml = `<tg-spoiler>${inlineHtml}</tg-spoiler>`;
          inlineFallback = `<tg-spoiler>${inlineFallback}</tg-spoiler>`;
          inlinePreview = `<tg-spoiler>${inlinePreview}</tg-spoiler>`;
          inlineMd = `||${inlineMd}||`;
          entities.push({ type: 'spoiler', offset, length });
          break;
        case 'code':
          inlineHtml = `<code>${inlineHtml}</code>`;
          inlineFallback = `<code>${inlineFallback}</code>`;
          inlinePreview = `<code>${inlinePreview}</code>`;
          inlineMd = `\`${text.replace(/`/g, '\\`')}\``;
          entities.push({ type: 'code', offset, length });
          break;
        case 'highlight':
          inlineHtml = `<mark>${inlineHtml}</mark>`;
          inlinePreview = `<mark>${inlinePreview}</mark>`;
          inlineMd = `==${inlineMd}==`;
          break;
        case 'link': {
          const url = mark.attrs?.href || '';
          inlineHtml = `<a href="${url}">${inlineHtml}</a>`;
          inlineFallback = `<a href="${url}">${inlineFallback}</a>`;
          inlinePreview = `<a href="${url}">${inlinePreview}</a>`;
          inlineMd = `[${inlineMd}](${url.replace(/([)\\])/g, '\\$1')})`;
          entities.push({ type: 'text_link', offset, length, url });
          break;
        }
        case 'subscript':
          inlineHtml = `<sub>${inlineHtml}</sub>`;
          inlinePreview = `<sub>${inlinePreview}</sub>`;
          inlineMd = `_${inlineMd}_`;
          break;
        case 'superscript':
          inlineHtml = `<sup>${inlineHtml}</sup>`;
          inlinePreview = `<sup>${inlinePreview}</sup>`;
          inlineMd = `^${inlineMd}^`;
          break;
        case 'referenceMark': {
          const refId = mark.attrs?.refId || '1';
          inlineHtml = `<a href="#${escapeTelegramHTML(refId)}">${inlineHtml}</a>`;
          inlineFallback = `<sup>${escapeTelegramHTML(refId)}</sup>`;
          inlinePreview = `<sup class="tg-preview-fn">${escapeTelegramHTML(refId)}</sup>`;
          inlineMd = `\\[${refId}\\]`;
          break;
        }
        case 'tgEmoji': {
          const emojiId = String(mark.attrs?.emojiId || '');
          const thumbUrl = String(mark.attrs?.thumbUrl || '');
          if (emojiId) {
            inlineHtml = `<tg-emoji emoji-id="${escapeTelegramHTML(emojiId)}">${inlineHtml}</tg-emoji>`;
            inlineFallback = inlineHtml;
            entities.push({ type: 'custom_emoji', offset, length, custom_emoji_id: emojiId });
          }
          if (thumbUrl) {
            inlinePreview = `<span class="tg-preview-custom-emoji"><img src="${escapeTelegramHTML(thumbUrl)}" alt="${inlinePreview}" /></span>`;
          }
          break;
        }
      }
    });

    // Auto-detect Telegram native entities in unlinked text:
    // Mentions (@username), Hashtags (#tag), Bot Commands (/cmd), Cashtags ($USD)
    const hasLinkMark = marks.some((m) => m.type === 'link');
    if (!hasLinkMark) {
      // 1. Mentions (@username)
      const mentionRegex = /(?:^|[^\w@])(@[a-zA-Z0-9_]{3,32})\b/g;
      let mMatch: RegExpExecArray | null;
      while ((mMatch = mentionRegex.exec(text)) !== null) {
        const fullMatch = mMatch[0];
        const mentionText = mMatch[1];
        const startIdx = mMatch.index + fullMatch.indexOf(mentionText);
        entities.push({
          type: 'mention',
          offset: offset + startIdx,
          length: mentionText.length,
        });
      }

      // 2. Hashtags (#tag, supports Cyrillic & Latin)
      const hashtagRegex = /(?:^|[^\w#])(#[a-zA-Z0-9_\u0400-\u04FF]{1,64})\b/g;
      let hMatch: RegExpExecArray | null;
      while ((hMatch = hashtagRegex.exec(text)) !== null) {
        const fullMatch = hMatch[0];
        const hashText = hMatch[1];
        const startIdx = hMatch.index + fullMatch.indexOf(hashText);
        entities.push({
          type: 'hashtag',
          offset: offset + startIdx,
          length: hashText.length,
        });
      }

      // 3. Bot commands (/command or /command@bot)
      const cmdRegex = /(?:^|\s)(\/[a-zA-Z0-9_]{1,64}(?:@[a-zA-Z0-9_]{3,32})?)\b/g;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = cmdRegex.exec(text)) !== null) {
        const fullMatch = cMatch[0];
        const cmdText = cMatch[1];
        const startIdx = cMatch.index + fullMatch.indexOf(cmdText);
        entities.push({
          type: 'bot_command',
          offset: offset + startIdx,
          length: cmdText.length,
        });
      }

      // 4. Cashtags ($USD)
      const cashRegex = /(?:^|[^\w$])(\$[A-Z]{1,8})\b/g;
      let csMatch: RegExpExecArray | null;
      while ((csMatch = cashRegex.exec(text)) !== null) {
        const fullMatch = csMatch[0];
        const cashText = csMatch[1];
        const startIdx = csMatch.index + fullMatch.indexOf(cashText);
        entities.push({
          type: 'cashtag',
          offset: offset + startIdx,
          length: cashText.length,
        });
      }
    }

    return { html: inlineHtml, fallback: inlineFallback, md: inlineMd, preview: inlinePreview };
  }

  processBlocks(doc.content);

  // Clean trailing spaces / newlines
  const plainText = plainTextAcc.trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = plainText.length;

  // Sort entities strictly by offset ascending, then length descending
  entities.sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return b.length - a.length;
  });

  // Convert math delimiters into native Telegram Bot API 10.1 tags:
  // Block math: $$ ... $$ -> <tg-math-block> ... </tg-math-block>
  // Inline math: $ ... $ -> <tg-math> ... </tg-math>
  const finalHtml = htmlAcc
    .replace(/\$\$([\s\S]*?)\$\$/g, '<tg-math-block>$1</tg-math-block>')
    .replace(/\$([^$\n<]+)\$/g, '<tg-math>$1</tg-math>')
    .trim();
  const finalPreview = previewHtmlAcc
    .replace(/\$\$([\s\S]*?)\$\$/g, '<tg-math-block>$1</tg-math-block>')
    .replace(/\$([^$\n<]+)\$/g, '<tg-math>$1</tg-math>')
    .trim();

  return {
    plainText,
    html: finalHtml,
    previewHtml: finalPreview,
    fallbackHtml: fallbackHtmlAcc.trim(),
    markdownV2: markdownV2Acc.trim(),
    entities,
    characterCount,
    wordCount,
    media,
    buttons,
    document,
    richMessage,
  };
}
