import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.SCHEDULER_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ error: 'Telegram bot not configured' });
    }

    const { Telegraf } = await import('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    const db = getDb();

    function getSmartTime(dateStr: string, timeStr: string): string {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      const now = new Date(new Date().getTime() + (4 * 60 * 60 * 1000));
      const target = new Date(year, month - 1, day, hour, minute);
      const diffMs = target.getTime() - now.getTime();
      
      const isToday = now.getUTCFullYear() === year && now.getUTCMonth() === month - 1 && now.getUTCDate() === day;
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = tomorrow.getUTCFullYear() === year && tomorrow.getUTCMonth() === month - 1 && tomorrow.getUTCDate() === day;

      if (diffMs > 0 && diffMs < 12 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
        const mins = Math.floor(diffMs / (1000 * 60));
        return `In ${mins} minute${mins > 1 ? 's' : ''}`;
      }

      const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      if (isToday) return `Today at ${timeFormatted}`;
      if (isTomorrow) return `Tomorrow at ${timeFormatted}`;
      return `${day}/${month}/${year} at ${timeFormatted}`;
    }

    function formatNotification(reminder: any): string {
      if (reminder.status === 'done') {
        return `✅ <b>TASK COMPLETED</b>\n\n📝 ${reminder.text}\n⏰ Was: ${reminder.time}`;
      }
      const statusMap: any = { 'todo': { label: 'To Do', emoji: '⚪' }, 'in_progress': { label: 'In Progress', emoji: '🟡' }, 'done': { label: 'Done', emoji: '🟢' } };
      const status = statusMap[reminder.status || 'todo'] || statusMap['todo'];
      const smartTime = getSmartTime(reminder.date, reminder.time);
      return `🔔 <b>REMINDER</b>\n\n📝 <b>${reminder.text}</b>\n\n📌 Status: ${status.emoji} ${status.label}\n⏰ ${smartTime}\n⚡ Priority: ${reminder.priority || 'MEDIUM'}\n` +
        (reminder.assigned_to_chat_id && reminder.creator_name ? `\n📨 From: ${reminder.creator_name}\n` : '') + `\n━━━━━━━━━━━━━━━`;
    }

    async function sendNotification(chatId: number, reminder: any): Promise<number | false> {
      try {
        const message = formatNotification(reminder);
        const msg = await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📝 Edit', callback_data: `edit_${reminder.id}` },
                { text: '🟡 In Progress', callback_data: `status_progress_${reminder.id}` },
                { text: '❌ Delete', callback_data: `delete_${reminder.id}` }
              ]
            ]
          }
        });
        return msg.message_id;
      } catch (error) {
        console.error('Error sending notification:', error);
        return false;
      }
    }

    const nowUTC = new Date();
    const nowTimestamp = nowUTC.getTime();
    const userLocalTime = new Date(nowUTC.getTime() + (4 * 60 * 60 * 1000));

    // Ensure column exists
    try {
      await db.query(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT`);
    } catch (e) {
      console.error('Failed to add telegram_message_id column:', e);
    }

    const currentHour = userLocalTime.getUTCHours();
    const currentMinute = userLocalTime.getUTCMinutes();
    const currentDate = `${userLocalTime.getUTCFullYear()}-${String(userLocalTime.getUTCMonth() + 1).padStart(2, '0')}-${String(userLocalTime.getUTCDate()).padStart(2, '0')}`;

    const minutesToCheck = [currentMinute];
    if (currentMinute === 0) minutesToCheck.push(59); else minutesToCheck.push(currentMinute - 1);

    let sentCount = 0, reRemindCount = 0, failedCount = 0;

    for (const minute of minutesToCheck) {
      let checkHour = currentHour;
      if (minute === 59 && currentMinute === 0) checkHour = currentHour === 0 ? 23 : currentHour - 1;
      const checkTime = `${String(checkHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      const { rows: reminders } = await db.query(`
        SELECT * FROM reminders WHERE date = $1 AND time = $2 AND done = false AND sent = false
      `, [currentDate, checkTime]);

      for (const reminder of reminders) {
        try {
          const targetChatId = reminder.assigned_to_chat_id || reminder.user_id;
          const msgId = await sendNotification(targetChatId, reminder);
          if (msgId) {
            await db.query(`UPDATE reminders SET sent = true, last_sent_at = $1, telegram_message_id = $2 WHERE id = $3`, [nowTimestamp, msgId, reminder.id]);
            sentCount++;
          } else failedCount++;
        } catch (err) { failedCount++; }
      }
    }

    const { rows: confirmReminders } = await db.query(`
      SELECT * FROM reminders WHERE confirm_required = true AND confirmed = false AND done = false AND sent = true
    `);

    for (const reminder of confirmReminders) {
      try {
        const lastSentAt = Number(reminder.last_sent_at) || 0;
        const reRemindInterval = (reminder.re_remind_interval || 5) * 60 * 1000;
        if (nowTimestamp - lastSentAt >= reRemindInterval) {
          const targetChatId = reminder.assigned_to_chat_id || reminder.user_id;
          const msgId = await sendNotification(targetChatId, reminder);
          if (msgId) {
            await db.query(`UPDATE reminders SET last_sent_at = $1, telegram_message_id = $2 WHERE id = $3`, [nowTimestamp, msgId, reminder.id]);
            reRemindCount++;
          } else failedCount++;
        }
      } catch (err) { failedCount++; }
    }

    let deletedCount = 0;
    if (currentHour === 3 && currentMinute <= 2) {
      const sevenDaysAgo = new Date(userLocalTime); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = `${sevenDaysAgo.getUTCFullYear()}-${String(sevenDaysAgo.getUTCMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getUTCDate()).padStart(2, '0')}`;
      
      const { rows: oldReminders } = await db.query(`SELECT id, notion_page_id, user_id FROM reminders WHERE date < $1`, [cutoffDate]);
      for (const old of oldReminders) {
        if (old.notion_page_id) {
          try {
            const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id FROM user_settings WHERE user_id = $1`, [old.user_id]);
            const userSettings = usRows[0];
            const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
            const { updateNotionStatus } = await import('../services/notion.js');
            await updateNotionStatus(old.notion_page_id, 'Archive', creds);
          } catch (e) { }
        }
        await db.query(`DELETE FROM reminders WHERE id = $1`, [old.id]);
        deletedCount++;
      }
    }

    return res.status(200).json({ message: 'Reminder check completed', newSent: sentCount, reReminded: reRemindCount, autoDeleted: deletedCount, failed: failedCount, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
