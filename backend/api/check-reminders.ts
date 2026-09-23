import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';
import { decryptText } from '../services/crypto.js';

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

    // --- Weekly 7-day auto-cleanup during scheduler runs ---
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    try {
      const { rows: expiredList } = await db.query(`
        SELECT id, user_id FROM reminders 
        WHERE (done = true OR status = 'done') AND created_at < $1
      `, [sevenDaysAgo]);

      if (expiredList.length > 0) {
        const ids = expiredList.map(r => r.id);
        await db.query(`DELETE FROM reminders WHERE id = ANY($1::text[])`, [ids]);
      }
    } catch (e) {
      console.error('Scheduler auto-cleanup warning:', e);
    }

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

    function formatNotification(reminder: any, userConfig?: any): string {
      const plainText = decryptText(reminder.text);
      if (reminder.status === 'done') {
        return `✅ <b>TASK COMPLETED</b>\n\n📝 ${plainText}\n⏰ Was: ${reminder.time}`;
      }

      if (!userConfig) {
        const statusMap: any = { 'todo': { label: 'To Do', emoji: '⚪' }, 'in_progress': { label: 'In Progress', emoji: '🟡' }, 'done': { label: 'Done', emoji: '🟢' } };
        const status = statusMap[reminder.status || 'todo'] || statusMap['todo'];
        const smartTime = getSmartTime(reminder.date, reminder.time);
        return `🔔 <b>REMINDER</b>\n\n📝 <b>${plainText}</b>\n\n📌 Status: ${status.emoji} ${status.label}\n⏰ ${smartTime}\n⚡ Priority: ${reminder.priority || 'MEDIUM'}\n` +
          (reminder.assigned_to_chat_id && reminder.creator_name ? `\n📨 From: ${reminder.creator_name}\n` : '') + `\n━━━━━━━━━━━━━━━`;
      }

      let formattedText = `<b>${plainText}</b>`;
      if (userConfig.textStyle === 'spoiler') {
        formattedText = `<tg-spoiler><b>${plainText}</b></tg-spoiler>`;
      } else if (userConfig.textStyle === 'quote') {
        formattedText = `<blockquote>${plainText}</blockquote>`;
      } else if (userConfig.textStyle === 'monospace') {
        formattedText = `<code>${plainText}</code>`;
      }

      let body = `🔔 <b>REMINDER</b>\n\n📝 ${formattedText}\n\n`;

      if (userConfig.showStatus !== false) {
        const statusMap: any = { 'todo': { label: 'To Do', emoji: '⚪' }, 'in_progress': { label: 'In Progress', emoji: '🟡' }, 'done': { label: 'Done', emoji: '🟢' } };
        const status = statusMap[reminder.status || 'todo'] || statusMap['todo'];
        body += `📌 Status: ${status.emoji} ${status.label}\n`;
      }

      if (userConfig.showTime !== false) {
        const smartTime = getSmartTime(reminder.date, reminder.time);
        body += `⏰ ${smartTime}\n`;
      }

      if (userConfig.showPriority !== false) {
        body += `⚡ Priority: ${reminder.priority || 'MEDIUM'}\n`;
      }

      if (userConfig.showCreator !== false && reminder.assigned_to_chat_id && reminder.creator_name) {
        body += `\n📨 From: ${reminder.creator_name}\n`;
      }

      body += `\n━━━━━━━━━━━━━━━`;
      return body;
    }

    function getKeyboard(reminder: any, userConfig?: any) {
      const currentStatus = reminder.status || (reminder.done ? 'done' : 'todo');
      const webAppUrl = process.env.WEBAPP_URL || 'https://frontend-dev-production-b4d9.up.railway.app';

      if (!userConfig || !userConfig.buttons) {
        const editBtn = { text: '📝 Edit', callback_data: `edit_${reminder.id}` };
        const deleteBtn = { text: '❌ Delete', callback_data: `delete_${reminder.id}` };

        if (currentStatus === 'done') {
          return { inline_keyboard: [[editBtn, deleteBtn]] };
        }
        if (currentStatus === 'in_progress') {
          return {
            inline_keyboard: [
              [{ text: '🟢 Done', callback_data: `status_done_${reminder.id}` }],
              [editBtn, deleteBtn]
            ]
          };
        }
        return {
          inline_keyboard: [
            [{ text: '🟡 In Progress', callback_data: `status_progress_${reminder.id}` }],
            [editBtn, deleteBtn]
          ]
        };
      }

      const buttons = userConfig.buttons;
      const rows: any[][] = [];
      const primaryRow: any[] = [];

      if (buttons.statusToggle !== false) {
        if (currentStatus === 'in_progress') {
          primaryRow.push({ text: '🟢 Done', callback_data: `status_done_${reminder.id}` });
        } else if (currentStatus !== 'done') {
          primaryRow.push({ text: '🟡 In Progress', callback_data: `status_progress_${reminder.id}` });
        }
      }

      if (buttons.snooze15) {
        primaryRow.push({ text: '⏰ +15m', callback_data: `snooze_15_${reminder.id}` });
      }

      if (primaryRow.length > 0) {
        rows.push(primaryRow);
      }

      const secondaryRow: any[] = [];
      if (buttons.edit !== false) {
        secondaryRow.push({ text: '📝 Edit', callback_data: `edit_${reminder.id}` });
      }
      if (buttons.dismissMsg) {
        secondaryRow.push({ text: '🗑 Dismiss', callback_data: `dismiss_${reminder.id}` });
      }
      if (buttons.deleteTask !== false) {
        secondaryRow.push({ text: '❌ Delete', callback_data: `delete_${reminder.id}` });
      }
      if (secondaryRow.length > 0) {
        rows.push(secondaryRow);
      }

      if (buttons.openApp) {
        rows.push([{ text: '🚀 Open Remigram', web_app: { url: webAppUrl } }]);
      }

      return { inline_keyboard: rows.length > 0 ? rows : [[{ text: '📝 Edit', callback_data: `edit_${reminder.id}` }]] };
    }

    async function sendNotification(chatId: number, reminder: any): Promise<number | false> {
      try {
        let userConfig: any = null;
        try {
          const { rows } = await db.query(`SELECT notification_config FROM user_settings WHERE user_id = $1`, [chatId]);
          if (rows[0]?.notification_config) {
            userConfig = typeof rows[0].notification_config === 'string' ? JSON.parse(rows[0].notification_config) : rows[0].notification_config;
          }
        } catch {}

        const message = formatNotification(reminder, userConfig);
        const keyboard = getKeyboard(reminder, userConfig);
        const msg = await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
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
