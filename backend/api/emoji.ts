import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setApiCors } from '../lib/telegramAuth.js';

/**
 * Telegram custom emoji catalog for Remigram Studio.
 *
 * GET /api/emoji
 *   -> { ok, sets: [{ name, title, stickers: [{ emoji, customEmojiId, thumbFileId }] }] }
 *
 * Packs come from:
 *  1. getForumTopicIconStickers — official Telegram custom emoji
 *  2. getStickerSet for RestrictedEmoji (Telegram Animated Emoji) plus
 *     TELEGRAM_CUSTOM_EMOJI_SETS (comma-separated short names)
 *
 * Thumbnails are loaded by the client via GET /api/upload?fileId=...
 */

type TgSticker = {
  emoji?: string;
  custom_emoji_id?: string;
  thumbnail?: { file_id: string };
  thumb?: { file_id: string };
  file_id?: string;
};

type CatalogSticker = {
  emoji: string;
  customEmojiId: string;
  thumbFileId: string | null;
};

type CatalogSet = {
  name: string;
  title: string;
  stickers: CatalogSticker[];
};

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { at: number; sets: CatalogSet[] } | null = null;

const DEFAULT_SETS = ['RestrictedEmoji'];

const mapSticker = (sticker: TgSticker): CatalogSticker | null => {
  if (!sticker.custom_emoji_id) return null;
  return {
    emoji: sticker.emoji || '▫️',
    customEmojiId: sticker.custom_emoji_id,
    thumbFileId: sticker.thumbnail?.file_id || sticker.thumb?.file_id || sticker.file_id || null,
  };
};

const tgCall = async (token: string, method: string, body?: Record<string, unknown>) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<{ ok: boolean; result?: any; description?: string }>;
};

const loadCatalog = async (token: string): Promise<CatalogSet[]> => {
  const sets: CatalogSet[] = [];
  const seen = new Set<string>();

  const pushSet = (name: string, title: string, stickers: CatalogSticker[]) => {
    const unique = stickers.filter((s) => {
      if (seen.has(s.customEmojiId)) return false;
      seen.add(s.customEmojiId);
      return true;
    });
    if (unique.length > 0) sets.push({ name, title, stickers: unique });
  };

  try {
    const forum = await tgCall(token, 'getForumTopicIconStickers');
    if (forum.ok && Array.isArray(forum.result)) {
      const stickers = forum.result.map(mapSticker).filter(Boolean) as CatalogSticker[];
      pushSet('forum_topic_icons', 'Telegram', stickers);
    }
  } catch (error) {
    console.error('[EMOJI] getForumTopicIconStickers failed:', error);
  }

  const extra = String(process.env.TELEGRAM_CUSTOM_EMOJI_SETS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const names = [...DEFAULT_SETS, ...extra];
  for (const name of names) {
    try {
      const pack = await tgCall(token, 'getStickerSet', { name });
      if (!pack.ok || !pack.result) {
        console.warn('[EMOJI] getStickerSet skipped', name, pack.description);
        continue;
      }
      const stickers = (pack.result.stickers || []).map(mapSticker).filter(Boolean) as CatalogSticker[];
      pushSet(pack.result.name || name, pack.result.title || name, stickers);
    } catch (error) {
      console.error('[EMOJI] getStickerSet failed:', name, error);
    }
  }

  return sets;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setApiCors(res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  try {
    const now = Date.now();
    if (!cache || now - cache.at > CACHE_TTL_MS) {
      cache = { at: now, sets: await loadCatalog(token) };
    }

    return res.status(200).json({ ok: true, sets: cache.sets });
  } catch (error: any) {
    console.error('[EMOJI] catalog failed:', error);
    return res.status(500).json({ error: error?.message || 'Failed to load Telegram emoji' });
  }
}
