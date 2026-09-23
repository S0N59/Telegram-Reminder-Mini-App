/**
 * Sanitizes pasted or imported HTML for Telegram compatibility.
 * Strips dangerous tags, scripts, and unknown attributes while preserving
 * formatting (bold, italic, underline, strike, spoiler, code, pre, quote, links).
 */

const ALLOWED_TAGS = new Set([
  'b', 'strong',
  'i', 'em',
  'u', 'ins',
  's', 'strike', 'del',
  'code', 'pre',
  'blockquote',
  'a',
  'p', 'br',
  'tg-spoiler',
  'tg-emoji',
  'span'
]);

export function sanitizePastedHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Strip out script, style, meta, head, object, iframe, etc.
    if (['script', 'style', 'meta', 'link', 'iframe', 'object', 'embed', 'form', 'input'].includes(tagName)) {
      return null;
    }

    // Process children first
    const cleanedChildren: Node[] = [];
    el.childNodes.forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) cleanedChildren.push(cleaned);
    });

    // Check if tag is allowed
    if (ALLOWED_TAGS.has(tagName)) {
      // Check for spoiler span
      if (tagName === 'span') {
        const isSpoiler =
          el.classList.contains('tg-spoiler') ||
          el.getAttribute('data-spoiler') === 'true' ||
          el.style.backgroundColor === 'black';

        if (isSpoiler) {
          const spoiler = document.createElement('tg-spoiler');
          cleanedChildren.forEach((child) => spoiler.appendChild(child));
          return spoiler;
        }

        // Check for underline or strikethrough in inline styles
        const textDecoration = el.style.textDecoration || '';
        if (textDecoration.includes('underline')) {
          const u = document.createElement('u');
          cleanedChildren.forEach((child) => u.appendChild(child));
          return u;
        }
        if (textDecoration.includes('line-through')) {
          const s = document.createElement('s');
          cleanedChildren.forEach((child) => s.appendChild(child));
          return s;
        }

        // Just unwrap the span
        const fragment = document.createDocumentFragment();
        cleanedChildren.forEach((child) => fragment.appendChild(child));
        return fragment;
      }

      const cleanEl = document.createElement(tagName);

      // Preserve only safe attributes
      if (tagName === 'a') {
        const href = el.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('tg://'))) {
          cleanEl.setAttribute('href', href);
          cleanEl.setAttribute('target', '_blank');
          cleanEl.setAttribute('rel', 'noopener noreferrer');
        } else {
          // Invalid href, just unwrap
          const fragment = document.createDocumentFragment();
          cleanedChildren.forEach((child) => fragment.appendChild(child));
          return fragment;
        }
      }

      if (tagName === 'tg-emoji') {
        const emojiId = el.getAttribute('emoji-id') || el.getAttribute('data-emoji-id');
        if (emojiId) cleanEl.setAttribute('emoji-id', emojiId);
        const thumb = el.getAttribute('data-thumb');
        if (thumb) cleanEl.setAttribute('data-thumb', thumb);
      }

      if (tagName === 'pre' || tagName === 'code') {
        const lang = el.getAttribute('class')?.match(/language-(\w+)/)?.[1];
        if (lang) {
          cleanEl.setAttribute('class', `language-${lang}`);
        }
      }

      cleanedChildren.forEach((child) => cleanEl.appendChild(child));
      return cleanEl;
    }

    // If tag is div, section, h1-h6, table, etc. -> convert block breaks to paragraphs
    if (['div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const p = document.createElement('p');
      cleanedChildren.forEach((child) => p.appendChild(child));
      return p;
    }

    // Otherwise unwrap children
    const fragment = document.createDocumentFragment();
    cleanedChildren.forEach((child) => fragment.appendChild(child));
    return fragment;
  }

  const container = document.createElement('div');
  doc.body.childNodes.forEach((node) => {
    const cleaned = cleanNode(node);
    if (cleaned) container.appendChild(cleaned);
  });

  return container.innerHTML;
}
