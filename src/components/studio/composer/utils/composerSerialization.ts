import { PostDocument, SerializedPostOutput } from '../types/composer';

// Escape characters for Telegram HTML: <, >, &
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

/**
 * Strips HTML tags and gets pure plain text
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Converts rich HTML content (from Tiptap) to Telegram-compliant HTML.
 * Normalizes <strong> to <b>, <em> to <i>, removes unsupported tags/styles.
 */
export function sanitizeToTelegramHTML(html: string): string {
  if (!html) return '';
  let clean = html
    .replace(/<strong>/gi, '<b>')
    .replace(/<\/strong>/gi, '</b>')
    .replace(/<em>/gi, '<i>')
    .replace(/<\/em>/gi, '</i>')
    .replace(/<del>/gi, '<s>')
    .replace(/<\/del>/gi, '</s>')
    .replace(/<ins>/gi, '<u>')
    .replace(/<\/ins>/gi, '</u>')
    .replace(/<span data-spoiler="true">(.*?)<\/span>/gi, '<tg-spoiler>$1</tg-spoiler>')
    .replace(/<span class="editor-spoiler-text">(.*?)<\/span>/gi, '<tg-spoiler>$1</tg-spoiler>')
    .replace(/<p><\/p>/gi, '<br/>');

  return clean;
}

/**
 * Converts rich HTML content to Telegram MarkdownV2
 */
export function htmlToMarkdownV2(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeTelegramMarkdownV2(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    let inner = '';
    el.childNodes.forEach((child) => {
      inner += traverse(child);
    });

    switch (tag) {
      case 'b':
      case 'strong':
        return `*${inner}*`;
      case 'i':
      case 'em':
        return `_${inner}_`;
      case 'u':
      case 'ins':
        return `__${inner}__`;
      case 's':
      case 'strike':
      case 'del':
        return `~${inner}~`;
      case 'tg-spoiler':
        return `||${inner}||`;
      case 'code':
        return `\`${(el.textContent || '').replace(/`/g, '\\`')}\``;
      case 'pre': {
        const lang = el.querySelector('code')?.getAttribute('class')?.match(/language-(\w+)/)?.[1] || '';
        return `\`\`\`${lang}\n${el.textContent || ''}\n\`\`\`\n`;
      }
      case 'blockquote': {
        const lines = inner.split('\n').map((l) => `>${l}`).join('\n');
        return `${lines}\n\n`;
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${inner}](${href.replace(/([)\\])/g, '\\$1')})`;
      }
      case 'p':
        return `${inner}\n\n`;
      case 'br':
        return '\n';
      default:
        // Check for spoiler span
        if (el.getAttribute('data-spoiler') === 'true' || el.classList.contains('editor-spoiler-text')) {
          return `||${inner}||`;
        }
        return inner;
    }
  }

  return traverse(div).trim();
}

/**
 * Main Serializer for the entire PostDocument.
 * Combines all blocks and validates against Telegram restrictions.
 */
export function serializePostDocument(doc: PostDocument): SerializedPostOutput {
  let plainTextAcc = '';
  let htmlAcc = '';
  let mdAcc = '';

  let mediaCount = 0;
  let fileCount = 0;
  let totalCaptionLength = 0;

  doc.blocks.forEach((block) => {
    if (block.type === 'text') {
      const textHtml = sanitizeToTelegramHTML(block.content);
      const textMd = htmlToMarkdownV2(block.content);
      const textPlain = htmlToPlainText(block.content);

      if (textPlain.trim()) {
        htmlAcc += `${textHtml}\n\n`;
        mdAcc += `${textMd}\n\n`;
        plainTextAcc += `${textPlain}\n\n`;
      }
    } else if (block.type === 'media_gallery') {
      mediaCount += block.items.length;
      if (block.caption) {
        const capHtml = sanitizeToTelegramHTML(block.caption);
        const capMd = htmlToMarkdownV2(block.caption);
        const capPlain = htmlToPlainText(block.caption);

        totalCaptionLength += capPlain.length;
        htmlAcc += `${capHtml}\n\n`;
        mdAcc += `${capMd}\n\n`;
        plainTextAcc += `${capPlain}\n\n`;
      }
    } else if (block.type === 'quote') {
      const quoteText = block.text.trim();
      if (quoteText) {
        const authorSuffix = block.author ? `\n— ${block.author}` : '';
        const fullQuote = quoteText + authorSuffix;

        htmlAcc += `<blockquote>${escapeTelegramHTML(fullQuote)}</blockquote>\n\n`;
        mdAcc += `>${escapeTelegramMarkdownV2(fullQuote).split('\n').join('\n>')}\n\n`;
        plainTextAcc += `"${fullQuote}"\n\n`;
      }
    } else if (block.type === 'code') {
      const rawCode = block.code.trim();
      if (rawCode) {
        const langAttr = block.language ? ` class="language-${block.language}"` : '';
        htmlAcc += `<pre><code${langAttr}>${escapeTelegramHTML(rawCode)}</code></pre>\n\n`;
        mdAcc += `\`\`\`${block.language || ''}\n${rawCode}\n\`\`\`\n\n`;
        plainTextAcc += `${rawCode}\n\n`;
      }
    } else if (block.type === 'file') {
      fileCount++;
      const sizeStr = block.size > 1024 * 1024
        ? `${(block.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(block.size / 1024)} KB`;
      const fileDesc = `📎 ${block.name} (${sizeStr})`;

      htmlAcc += `<b>${escapeTelegramHTML(fileDesc)}</b>\n\n`;
      mdAcc += `*${escapeTelegramMarkdownV2(fileDesc)}*\n\n`;
      plainTextAcc += `${fileDesc}\n\n`;
    }
  });

  const plainText = plainTextAcc.trim();
  const html = htmlAcc.trim();
  const markdownV2 = mdAcc.trim();

  const characterCount = plainText.length;
  const hasMedia = mediaCount > 0;
  const hasFiles = fileCount > 0;

  // Telegram limits verification:
  // - If media post: caption max is 1024 characters.
  // - If text-only post: message max is 4096 characters.
  let isOverLimit = false;
  let limitErrorMessage: string | undefined;

  if (hasMedia) {
    if (totalCaptionLength > 1024) {
      isOverLimit = true;
      limitErrorMessage = `Media caption exceeds Telegram limit of 1,024 characters (${totalCaptionLength} / 1,024)`;
    }
  } else {
    if (characterCount > 4096) {
      isOverLimit = true;
      limitErrorMessage = `Post text exceeds Telegram limit of 4,096 characters (${characterCount} / 4,096)`;
    }
  }

  return {
    plainText,
    html,
    markdownV2,
    characterCount,
    captionCharacterCount: totalCaptionLength,
    isOverLimit,
    limitErrorMessage,
    hasMedia,
    hasFiles,
    mediaCount,
    fileCount,
  };
}
