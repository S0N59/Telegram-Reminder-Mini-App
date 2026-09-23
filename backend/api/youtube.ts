import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';
import { requireTelegramUser, setApiCors } from '../lib/telegramAuth.js';
import {
  resolveYouTubeChannelId,
  fetchLatestYouTubeVideos,
  renderYouTubePostTemplate,
  DEFAULT_YOUTUBE_POST_TEMPLATE,
} from '../services/youtubeService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setApiCors(res, 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const telegramUser = requireTelegramUser(req, res);
  if (!telegramUser) return;

  const db = getDb();

  // Auto-create database tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS youtube_integrations (
      id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE,
      youtube_channel_id TEXT NOT NULL,
      youtube_api_key TEXT,
      target_channel_id TEXT,
      post_template TEXT NOT NULL,
      attach_thumbnail BOOLEAN DEFAULT true,
      include_watch_button BOOLEAN DEFAULT true,
      auto_publish BOOLEAN DEFAULT false,
      last_video_id TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_youtube_integrations_user_id ON youtube_integrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_youtube_integrations_active ON youtube_integrations(is_active);

    CREATE TABLE IF NOT EXISTS youtube_pending_posts (
      id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      video_id TEXT NOT NULL,
      video_title TEXT NOT NULL,
      video_url TEXT NOT NULL,
      video_description TEXT,
      thumbnail_url TEXT,
      formatted_html TEXT NOT NULL,
      target_channel_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_youtube_pending_user_status ON youtube_pending_posts(user_id, status);
  `).catch((err) => {
    console.error('[YOUTUBE_DB_INIT] Error creating tables:', err);
  });

  const path = req.url || '';

  try {
    // ════════════════════════════════════════════════════════════════
    // 1. POST /api/youtube/test - Test connection & template preview
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && (path.includes('/test') || req.body?.action === 'test')) {
      const { channelIdentifier, apiKey, template } = req.body;
      if (!channelIdentifier) {
        return res.status(400).json({ error: 'channelIdentifier is required' });
      }

      const resolvedChannelId = await resolveYouTubeChannelId(channelIdentifier, apiKey);
      const videos = await fetchLatestYouTubeVideos(resolvedChannelId, apiKey);

      if (videos.length === 0) {
        return res.status(404).json({ error: 'No videos found on this YouTube channel.' });
      }

      const latest = videos[0];
      const previewHtml = renderYouTubePostTemplate(template || DEFAULT_YOUTUBE_POST_TEMPLATE, latest);

      return res.status(200).json({
        ok: true,
        channelId: resolvedChannelId,
        channelTitle: latest.channelTitle,
        latestVideo: latest,
        previewHtml,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // 2. GET /api/youtube/pending - Fetch pending YouTube drafts for Studio
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && (path.includes('/pending') || req.query?.action === 'pending')) {
      const pendingId = req.query?.id as string;
      if (pendingId) {
        const { rows } = await db.query(
          `SELECT * FROM youtube_pending_posts WHERE id = $1 AND user_id = $2`,
          [pendingId, telegramUser.id]
        );
        return res.status(200).json(rows[0] || null);
      }

      const { rows } = await db.query(
        `SELECT * FROM youtube_pending_posts WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 10`,
        [telegramUser.id]
      );
      return res.status(200).json(rows);
    }

    // ════════════════════════════════════════════════════════════════
    // 3. POST /api/youtube/publish - Instant publish pending post
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && (path.includes('/publish') || req.body?.action === 'publish')) {
      const { pendingId } = req.body;
      if (!pendingId) {
        return res.status(400).json({ error: 'pendingId is required' });
      }

      const { rows: pendingRows } = await db.query(
        `SELECT * FROM youtube_pending_posts WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
        [pendingId, telegramUser.id]
      );
      if (pendingRows.length === 0) {
        return res.status(404).json({ error: 'Pending post not found or already published' });
      }

      const pending = pendingRows[0];
      const publishRes = await publishYouTubePostToChannel(db, telegramUser.id, pending);

      if (publishRes.ok) {
        await db.query(`UPDATE youtube_pending_posts SET status = 'published' WHERE id = $1`, [pendingId]);
        return res.status(200).json({ ok: true, message: 'Published successfully' });
      } else {
        return res.status(500).json({ error: publishRes.error || 'Failed to publish post' });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 4. GET /api/youtube - Fetch current user's integration settings
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const { rows } = await db.query(
        `SELECT * FROM youtube_integrations WHERE user_id = $1`,
        [telegramUser.id]
      );
      return res.status(200).json(rows[0] || null);
    }

    // ════════════════════════════════════════════════════════════════
    // 5. POST /api/youtube - Save / update integration settings
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      const {
        youtubeChannelId,
        youtubeApiKey,
        targetChannelId,
        postTemplate,
        attachThumbnail = true,
        includeWatchButton = true,
        autoPublish = false,
        isActive = true,
      } = req.body;

      if (!youtubeChannelId) {
        return res.status(400).json({ error: 'youtubeChannelId is required' });
      }

      // Resolve identifier if needed
      const resolvedChannelId = await resolveYouTubeChannelId(youtubeChannelId, youtubeApiKey);

      // Verify channel exists by fetching videos
      const videos = await fetchLatestYouTubeVideos(resolvedChannelId, youtubeApiKey);
      const latestVideoId = videos.length > 0 ? videos[0].id : null;

      const id = `yt_${telegramUser.id}`;
      const now = Date.now();
      const template = (postTemplate || DEFAULT_YOUTUBE_POST_TEMPLATE).trim();

      const { rows } = await db.query(`
        INSERT INTO youtube_integrations (
          id, user_id, youtube_channel_id, youtube_api_key, target_channel_id,
          post_template, attach_thumbnail, include_watch_button, auto_publish,
          last_video_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        ON CONFLICT (user_id) DO UPDATE SET
          youtube_channel_id = EXCLUDED.youtube_channel_id,
          youtube_api_key = EXCLUDED.youtube_api_key,
          target_channel_id = EXCLUDED.target_channel_id,
          post_template = EXCLUDED.post_template,
          attach_thumbnail = EXCLUDED.attach_thumbnail,
          include_watch_button = EXCLUDED.include_watch_button,
          auto_publish = EXCLUDED.auto_publish,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `, [
        id,
        telegramUser.id,
        resolvedChannelId,
        youtubeApiKey || null,
        targetChannelId || null,
        template,
        attachThumbnail,
        includeWatchButton,
        autoPublish,
        latestVideoId,
        isActive,
        now,
      ]);

      return res.status(200).json({ ok: true, integration: rows[0] });
    }

    // ════════════════════════════════════════════════════════════════
    // 6. DELETE /api/youtube - Disconnect YouTube integration
    // ════════════════════════════════════════════════════════════════
    if (req.method === 'DELETE') {
      await db.query(`DELETE FROM youtube_integrations WHERE user_id = $1`, [telegramUser.id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[YOUTUBE_API_ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Publishes a pending post to the target Telegram channel
 */
export async function publishYouTubePostToChannel(
  db: any,
  userId: number,
  pending: any
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };

  // 1. Get target channel details
  const { rows: channelRows } = await db.query(
    `SELECT * FROM user_channels WHERE id = $1 AND user_id = $2`,
    [pending.target_channel_id, userId]
  );
  if (channelRows.length === 0) {
    return { ok: false, error: 'Target Telegram channel not found or not linked' };
  }

  const targetChatId = channelRows[0].chat_id;

  // 2. Build inline keyboard button for watching video
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '🍿 Watch on YouTube',
          url: pending.video_url,
        },
      ],
    ],
  };

  // 3. Post as Photo (with thumbnail) or Text message
  try {
    let tgRes;
    if (pending.thumbnail_url) {
      // Photo captions in Telegram have a 1024-character limit
      const caption = pending.formatted_html.length > 1024
        ? pending.formatted_html.substring(0, 1020) + '...'
        : pending.formatted_html;

      tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          photo: pending.thumbnail_url,
          caption,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
    } else {
      tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: pending.formatted_html,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
    }

    const tgData = (await tgRes.json()) as any;
    if (!tgData.ok) {
      return { ok: false, error: tgData.description || 'Telegram API error' };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to dispatch to Telegram' };
  }
}
