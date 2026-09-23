import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.SCHEDULER_API_KEY || process.env.ENCRYPTION_SECRET;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  const db = getDb();
  const { message, customUserIds } = req.body || {};

  const releaseMessage = message || `✨ <b>Remigram Update · What’s New</b> ✨\n\n` +
    `We’ve packed this update with major new features, refreshed UI design, and smoother interactions!\n\n` +
    `👥 <b>Collaborative Group Reminders (New!)</b>\n` +
    `You can now create and send a single reminder to multiple friends at once! Track everyone’s progress live — see who is working on the task and who has completed their part.\n\n` +
    `⏰ <b>Redesigned Time Wheel Picker</b>\n` +
    `Setting dates and times is now smoother than ever. Enjoy an intuitive time wheel picker with tactile feedback and instant smart scheduling.\n\n` +
    `🎨 <b>Refined Card Design & Smooth Animations</b>\n` +
    `Experience modern task cards in Inbox with satisfying micro-animations when transitioning status from <i>In Progress</i> 🟡 to <i>Done</i> 🟢.\n\n` +
    `📱 <b>Mobile Experience & Navigation Fixes</b>\n` +
    `Enhanced responsiveness across all devices with smart bottom navigation that never gets in your way.\n\n` +
    `⚡ <b>Performance & Bug Fixes</b>\n` +
    `General stability optimizations to make task management faster, lighter, and more reliable.\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🚀 <i>Tap below to explore the update!</i>`;


  try {
    let targetUserIds: number[] = [];

    if (Array.isArray(customUserIds) && customUserIds.length > 0) {
      targetUserIds = customUserIds.map(Number).filter(n => !isNaN(n));
    } else {
      // Gather all unique users from database
      const usersQuery = await db.query(`
        SELECT DISTINCT user_id FROM (
          SELECT user_id FROM bot_users
          UNION
          SELECT user_id FROM user_settings
          UNION
          SELECT user_id FROM reminders
          UNION
          SELECT CAST(assigned_to_chat_id AS bigint) AS user_id FROM reminders WHERE assigned_to_chat_id IS NOT NULL
        ) all_users
        WHERE user_id IS NOT NULL
      `);

      targetUserIds = usersQuery.rows.map((r: any) => Number(r.user_id)).filter(n => !isNaN(n) && n > 0);
    }

    console.log(`[BROADCAST] Starting broadcast to ${targetUserIds.length} users...`);

    const results = {
      total: targetUserIds.length,
      sent: 0,
      failed: 0,
      errors: [] as any[]
    };

    const webAppUrl = process.env.WEBAPP_URL || 'https://frontend-dev-production-b4d9.up.railway.app';

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🚀 Open Remigram',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    };

    for (const chatId of targetUserIds) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: releaseMessage,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });

        const data: any = await response.json();
        if (data.ok) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ chatId, error: data.description });
        }

        await new Promise(resolve => setTimeout(resolve, 60));
      } catch (err: any) {
        results.failed++;
        results.errors.push({ chatId, error: err.message });
      }
    }

    console.log(`[BROADCAST] Finished: ${results.sent} sent, ${results.failed} failed`);
    return res.status(200).json(results);
  } catch (error: any) {
    console.error('[BROADCAST] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
