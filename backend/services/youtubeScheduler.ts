import { getDb } from '../api/db.js';
import {
  fetchLatestYouTubeVideos,
  renderYouTubePostTemplate,
  escapeHtml,
} from './youtubeService.js';
import { publishYouTubePostToChannel } from '../api/youtube.js';

export async function checkYouTubeUploads(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const db = getDb();

  try {
    // 1. Fetch all active integrations
    const { rows: integrations } = await db.query(`
      SELECT yi.*, uc.title as target_channel_title, uc.chat_id as target_chat_id
      FROM youtube_integrations yi
      LEFT JOIN user_channels uc ON uc.id = yi.target_channel_id
      WHERE yi.is_active = true AND yi.target_channel_id IS NOT NULL
    `).catch(() => ({ rows: [] }));

    if (!integrations || integrations.length === 0) return;

    const webAppUrl = process.env.WEBAPP_URL || 'https://frontend-dev-production-b4d9.up.railway.app';

    for (const item of integrations) {
      try {
        const videos = await fetchLatestYouTubeVideos(item.youtube_channel_id, item.youtube_api_key);
        if (!videos || videos.length === 0) continue;

        const latestVideo = videos[0];

        // First time initializing
        if (!item.last_video_id) {
          await db.query(
            `UPDATE youtube_integrations SET last_video_id = $1, updated_at = $2 WHERE id = $3`,
            [latestVideo.id, Date.now(), item.id]
          );
          continue;
        }

        // New video detected!
        if (latestVideo.id !== item.last_video_id) {
          console.log(`[YOUTUBE_SCHEDULER] 🎬 New video found for user ${item.user_id}: "${latestVideo.title}" (${latestVideo.id})`);

          const formattedHtml = renderYouTubePostTemplate(item.post_template, latestVideo);
          const pendingId = `yt_post_${item.user_id}_${Date.now()}`;
          const now = Date.now();

          // Save pending post record
          await db.query(`
            INSERT INTO youtube_pending_posts (
              id, user_id, video_id, video_title, video_url, video_description,
              thumbnail_url, formatted_html, target_channel_id, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            pendingId,
            item.user_id,
            latestVideo.id,
            latestVideo.title,
            latestVideo.url,
            latestVideo.description,
            item.attach_thumbnail ? latestVideo.thumbnailUrl : null,
            formattedHtml,
            item.target_channel_id,
            'pending',
            now,
          ]);

          // Update last_video_id
          await db.query(
            `UPDATE youtube_integrations SET last_video_id = $1, updated_at = $2 WHERE id = $3`,
            [latestVideo.id, now, item.id]
          );

          // Option A: Auto-publish immediately
          if (item.auto_publish) {
            const pubRes = await publishYouTubePostToChannel(db, item.user_id, {
              target_channel_id: item.target_channel_id,
              thumbnail_url: item.attach_thumbnail ? latestVideo.thumbnailUrl : null,
              formatted_html: formattedHtml,
              video_url: latestVideo.url,
            });

            if (pubRes.ok) {
              await db.query(`UPDATE youtube_pending_posts SET status = 'published' WHERE id = $1`, [pendingId]);
              // Notify creator
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: item.user_id,
                  text: `🚀 <b>New Video Published!</b>\n\n` +
                        `📺 <b>${escapeHtml(latestVideo.title)}</b>\n\n` +
                        `Your new YouTube video was automatically published to <b>${escapeHtml(item.target_channel_title || 'your channel')}</b>!`,
                  parse_mode: 'HTML',
                }),
              });
            }
          } else {
            // Option B: Ask creator (approval / studio editing flow)
            const cleanSnippet = formattedHtml.replace(/<[^>]*>/g, ' ').substring(0, 180).trim();

            const messageText =
              `🎬 <b>New YouTube Video Detected!</b>\n\n` +
              `📺 <b>${escapeHtml(latestVideo.title)}</b>\n` +
              `👤 Channel: <b>${escapeHtml(latestVideo.channelTitle)}</b>\n\n` +
              `Remigram prepared your post for <b>${escapeHtml(item.target_channel_title || 'your channel')}</b>:\n` +
              `<blockquote>${escapeHtml(cleanSnippet)}...</blockquote>\n\n` +
              `What would you like to do?`;

            const replyMarkup = {
              inline_keyboard: [
                [
                  {
                    text: '🚀 Publish Now',
                    callback_data: `yt_pub_${pendingId}`,
                  },
                ],
                [
                  {
                    text: '✏️ Edit in Remigram Studio',
                    web_app: {
                      url: `${webAppUrl}?mode=editor&yt_pending_id=${pendingId}`,
                    },
                  },
                ],
                [
                  {
                    text: '✕ Dismiss',
                    callback_data: `yt_dsm_${pendingId}`,
                  },
                ],
              ],
            };

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: item.user_id,
                text: messageText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
              }),
            });
          }
        }
      } catch (innerErr) {
        console.error(`[YOUTUBE_SCHEDULER] Error processing integration for user ${item.user_id}:`, innerErr);
      }
    }
  } catch (err) {
    console.error('[YOUTUBE_SCHEDULER] Global scheduler error:', err);
  }
}
