import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireTelegramUser, setApiCors } from '../lib/telegramAuth.js';

/**
 * Local media upload for Remigram Studio.
 *
 * Telegram cannot fetch files from a user's phone, so the file is streamed to
 * this endpoint, forwarded to Telegram once to mint a permanent `file_id`, and
 * the throwaway carrier message is deleted right away. The `file_id` stays
 * valid for the bot afterwards and can be reused when publishing the post.
 *
 * POST /api/upload?type=photo|video|audio&name=<filename>&mime=<content-type>
 *   body: raw file bytes (Content-Type: application/octet-stream)
 *   -> { ok, fileId, previewUrl, type, name, size }
 *
 * GET /api/upload?fileId=<id>
 *   -> streams the file back so the editor can show a thumbnail without
 *      exposing the bot token to the client.
 */

const MAX_SIZE: Record<string, number> = {
  // Bot API upload ceilings: 10 MB for photos, 50 MB for everything else.
  photo: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};

const ENDPOINTS: Record<string, { method: string; field: string }> = {
  photo: { method: 'sendPhoto', field: 'photo' },
  video: { method: 'sendVideo', field: 'video' },
  audio: { method: 'sendAudio', field: 'audio' },
};

const extractFileId = (result: any, type: string): string | null => {
  if (!result) return null;
  if (type === 'photo') {
    const photos = result.photo;
    if (Array.isArray(photos) && photos.length > 0) {
      // Largest available size is last.
      return photos[photos.length - 1]?.file_id ?? null;
    }
    return result.document?.file_id ?? null;
  }
  if (type === 'video') return result.video?.file_id ?? result.document?.file_id ?? null;
  if (type === 'audio') {
    return result.audio?.file_id ?? result.voice?.file_id ?? result.document?.file_id ?? null;
  }
  return null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setApiCors(res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  // ── GET: stream a previously uploaded file back to the editor ──
  if (req.method === 'GET') {
    const fileId = String((req.query as any).fileId || '');
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    try {
      const metaRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      const meta: any = await metaRes.json();
      if (!meta?.ok || !meta.result?.file_path) {
        return res.status(404).json({ error: meta?.description || 'File not found' });
      }

      const fileRes = await fetch(
        `https://api.telegram.org/file/bot${token}/${meta.result.file_path}`
      );
      if (!fileRes.ok) {
        return res.status(502).json({ error: 'Failed to download file from Telegram' });
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      res.setHeader('Content-Type', fileRes.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).end(buffer);
    } catch (error: any) {
      console.error('[UPLOAD] GET failed:', error);
      return res.status(500).json({ error: error?.message || 'Failed to fetch file' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const telegramUser = requireTelegramUser(req, res);
  if (!telegramUser) return;

  const type = String((req.query as any).type || 'photo').toLowerCase();
  const endpoint = ENDPOINTS[type];
  if (!endpoint) {
    return res.status(400).json({ error: `Unsupported media type: ${type}` });
  }

  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: 'Empty request body — send the raw file bytes' });
  }

  const limit = MAX_SIZE[type];
  if (body.length > limit) {
    return res.status(413).json({
      error: `File is too large for Telegram (${Math.round(body.length / 1048576)} MB). Limit for ${type} is ${limit / 1048576} MB.`,
    });
  }

  const rawName = String((req.query as any).name || '').trim();
  const name = rawName.replace(/[\r\n"]/g, '').slice(0, 120) || `upload.${type === 'photo' ? 'jpg' : 'bin'}`;
  const mime = String((req.query as any).mime || 'application/octet-stream').replace(/[\r\n"]/g, '');

  try {
    const form = new FormData();
    form.append('chat_id', String(telegramUser.id));
    form.append('disable_notification', 'true');
    form.append(endpoint.field, new Blob([body], { type: mime }), name);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/${endpoint.method}`, {
      method: 'POST',
      body: form as any,
    });
    const tgData: any = await tgRes.json();

    if (!tgData?.ok) {
      console.warn('[UPLOAD] Telegram rejected the file:', tgData?.description);
      return res.status(400).json({ error: tgData?.description || 'Telegram rejected the file' });
    }

    const fileId = extractFileId(tgData.result, type);
    const messageId = tgData.result?.message_id;

    // The carrier message was only needed to mint the file_id.
    if (messageId) {
      fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramUser.id, message_id: messageId }),
      }).catch(() => {});
    }

    if (!fileId) {
      return res.status(500).json({ error: 'Telegram did not return a file_id' });
    }

    return res.status(200).json({
      ok: true,
      fileId,
      previewUrl: `/api/upload?fileId=${encodeURIComponent(fileId)}`,
      type,
      name,
      size: body.length,
    });
  } catch (error: any) {
    console.error('[UPLOAD] POST failed:', error);
    return res.status(500).json({ error: error?.message || 'Upload failed' });
  }
}
