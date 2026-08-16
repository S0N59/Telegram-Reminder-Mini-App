import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

// Direct Telegram API calls (more reliable than Telegraf in serverless)
async function answerCallback(token: string, callbackId: string, text: string, showAlert: boolean = false): Promise<void> {
  const API = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: showAlert })
  });
}

async function deleteMessage(token: string, chatId: number, messageId: number): Promise<boolean> {
  const API = `https://api.telegram.org/bot${token}/deleteMessage`;
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  });
  return res.ok;
}

async function editMessage(token: string, chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<boolean> {
  const API = `https://api.telegram.org/bot${token}/editMessageText`;
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

// Helpers for formatting
function getSmartTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  const now = new Date(new Date().getTime() + (4 * 60 * 60 * 1000)); // UTC+4
  const target = new Date(year, month - 1, day, hour, minute);
  
  const diffMs = target.getTime() - now.getTime();
  const isToday = now.getUTCFullYear() === year && now.getUTCMonth() === month - 1 && now.getUTCDate() === day;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
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
  const statusMap: any = {
    'todo': { label: 'To Do', emoji: '⚪' },
    'in_progress': { label: 'In Progress', emoji: '🟡' },
    'done': { label: 'Done', emoji: '🟢' }
  };
  
  const currentStatus = reminder.status || (reminder.done ? 'done' : 'todo');
  const status = statusMap[currentStatus] || statusMap['todo'];
  const smartTime = getSmartTime(reminder.date, reminder.time);
  
  return `🔔 <b>REMINDER</b>\n\n` +
         `📝 <b>${reminder.text}</b>\n\n` +
         `📌 Status: ${status.emoji} ${status.label}\n` +
         `⏰ ${smartTime}\n` +
         `⚡ Priority: ${reminder.priority || 'MEDIUM'}\n` +
         (reminder.assigned_to_chat_id && reminder.creator_name
           ? `\n📨 From: ${reminder.creator_name}\n`
           : '') +
         `\n━━━━━━━━━━━━━━━`;
}

function getKeyboard(reminder: any) {
  const currentStatus = reminder.status || (reminder.done ? 'done' : 'todo');
  const editBtn = { text: '📝 Edit', callback_data: `edit_${reminder.id}` };
  const deleteBtn = { text: '❌ Delete', callback_data: `delete_${reminder.id}` };

  if (currentStatus === 'done') {
    return {
      inline_keyboard: [
        [editBtn, deleteBtn]
      ]
    };
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[WEBHOOK] TELEGRAM_BOT_TOKEN missing');
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;
    let db: any = null;
    try {
      db = getDb();
    } catch (e) {
      console.error('[WEBHOOK] DB init failed:', e);
    }

    const fromUser = update.message?.from || update.callback_query?.from;
    let registerPromise: Promise<void> | null = null;
    
    if (db && fromUser?.id) {
      registerPromise = (async () => {
        try {
          await db.query(`
            INSERT INTO bot_users (user_id, username, first_name, last_name, registered_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
              username = $2, first_name = $3, last_name = $4
          `, [fromUser.id, fromUser.username || null, fromUser.first_name || null, fromUser.last_name || null, Date.now()]);
          console.log(`[WEBHOOK] Registered/updated bot_user ${fromUser.id}`);
        } catch (e: any) {
          console.error('[WEBHOOK] bot_users upsert exception:', e);
        }
      })();
    }

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const text = update.message.text || '';
      const chatId = update.message.chat.id;
      const firstName = update.message.from?.first_name || 'there';
      const fromUserObj = update.message.from;
      
      const startParam = text.split(' ')[1] || '';
      
      if (startParam.startsWith('add_')) {
        const inviterIdStr = startParam.substring(4);
        const inviterId = parseInt(inviterIdStr);
        const inviteeId = fromUserObj?.id;
        
        if (inviteeId && !isNaN(inviterId) && inviterId !== inviteeId) {
          if (registerPromise) await registerPromise;
          
          if (db) {
            try {
              const { rows: inviterRows } = await db.query(`SELECT username, first_name, last_name FROM bot_users WHERE user_id = $1`, [inviterId]);
              const inviterUser = inviterRows[0];
              
              const timestamp = Date.now();
              await db.query(`
                INSERT INTO user_connections (user_id_1, user_id_2, created_at)
                VALUES ($1, $2, $3), ($2, $1, $3)
                ON CONFLICT DO NOTHING
              `, [inviterId, inviteeId, timestamp]);
              
              const inviterName = inviterUser ? (inviterUser.username ? `@${inviterUser.username}` : `${inviterUser.first_name || 'Friend'}`) : 'Friend';
              const inviteeName = fromUserObj.username ? `@${fromUserObj.username}` : `${fromUserObj.first_name || 'Friend'}`;
              
              // Inform Invitee
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: inviteeId,
                  text: `🎉 <b>Connected!</b> You are now connected with ${inviterName}.\n\nYou can now select each other in the Contact Picker and send reminders!`,
                  parse_mode: 'HTML'
                })
              });
              
              // Inform Inviter
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: inviterId,
                  text: `🎉 <b>New Contact!</b> ${inviteeName} has accepted your invite and is now in your contacts.\n\nYou can now send them reminders using the Mini App!`,
                  parse_mode: 'HTML'
                })
              });
              
              return res.status(200).json({ ok: true });
            } catch (err) {
              console.error('[WEBHOOK] Error creating connection:', err);
            }
          }
        }
      }
      
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 Hey ${firstName}! Welcome to Reminder Bot.\n\nYou can now receive reminders from other users.\nOpen the Mini App to create and manage your reminders.`,
          parse_mode: 'HTML'
        })
      });
      return res.status(200).json({ ok: true });
    }

    if (!update.callback_query) return res.status(200).json({ ok: true });

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data || '';
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;
    const callbackId = callbackQuery.id;

    console.log(`[WEBHOOK] Action: ${data}, Chat: ${chatId}, Message: ${messageId}`);

    if (!data || !chatId || !messageId) {
      await answerCallback(token, callbackId, '❌ Error: Missing data');
      return res.status(200).json({ ok: true });
    }

    const parts = data.split('_');
    const action = parts[0]; 
    let reminderId = '';
    let statusValue = '';

    if (action === 'status') {
      const subAction = parts[1];
      statusValue = subAction === 'progress' ? 'in_progress' : (subAction === 'done' ? 'done' : 'todo');
      reminderId = parts.slice(2).join('_');
    } else {
      reminderId = parts.slice(1).join('_');
    }

    if (action === 'status') {
      const confirmed = statusValue !== 'todo';
      const done = statusValue === 'done';

      try {
        const { rows } = await db.query(`
          UPDATE reminders SET confirmed = $1, done = $2, status = $3
          WHERE id = $4 RETURNING *
        `, [confirmed, done, statusValue, reminderId]);
        const updatedReminder = rows[0];

        if (updatedReminder) {
          await answerCallback(token, callbackId, statusValue === 'in_progress' ? '🟡 In Progress' : '🟢 Done');
          await editMessage(token, chatId, messageId, formatNotification(updatedReminder), getKeyboard(updatedReminder));

          if (updatedReminder.notion_page_id) {
            const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id FROM user_settings WHERE user_id = $1`, [updatedReminder.user_id]);
            const userSettings = usRows[0];
            const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
            const { updateNotionStatus } = await import('../services/notion.js');
            const notionStatus = statusValue === 'in_progress' ? 'In Progress' : (statusValue === 'done' ? 'Done' : 'To Do');
            updateNotionStatus(updatedReminder.notion_page_id, notionStatus, creds).catch(e => console.error('Notion error:', e));
          }
        }
      } catch (error) {
        console.error('[WEBHOOK] Postgres update error:', error);
        await answerCallback(token, callbackId, '❌ DB Error');
      }

    } else if (action === 'delete') {
      try {
        const { rows: reminderRows } = await db.query(`SELECT notion_page_id, user_id FROM reminders WHERE id = $1`, [reminderId]);
        const reminder = reminderRows[0];

        if (reminder?.notion_page_id) {
          const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id FROM user_settings WHERE user_id = $1`, [reminder.user_id]);
          const userSettings = usRows[0];
          const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
          const { updateNotionStatus } = await import('../services/notion.js');
          updateNotionStatus(reminder.notion_page_id, 'Archive', creds).catch(e => console.error('Notion delete error:', e));
        }

        if (reminder) {
          try {
            const { rows: statRows } = await db.query(`SELECT total_deleted FROM user_settings WHERE user_id = $1`, [reminder.user_id]);
            const currentDeleted = statRows[0]?.total_deleted || 0;
            await db.query(`
              INSERT INTO user_settings (user_id, total_deleted, updated_at) 
              VALUES ($1, $2, $3)
              ON CONFLICT (user_id) DO UPDATE SET total_deleted = $2, updated_at = $3
            `, [reminder.user_id, currentDeleted + 1, Date.now()]);
          } catch (e) {
            console.error('Failed to increment total_deleted in webhook:', e);
          }
        }

        await db.query(`DELETE FROM reminders WHERE id = $1`, [reminderId]);
        await answerCallback(token, callbackId, '🗑️ Deleted');
        const deleted = await deleteMessage(token, chatId, messageId);
        if (!deleted) {
          await editMessage(token, chatId, messageId, '🗑️ <b>Deleted</b>');
        }
      } catch (error) {
        console.error('[WEBHOOK] Delete error:', error);
        await answerCallback(token, callbackId, '❌ Failed to delete');
      }
    } else if (action === 'edit') {
      await answerCallback(token, callbackId, '💡 Use the Mini App to edit text', true);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Fatal error:', error);
    return res.status(200).json({ ok: true });
  }
}
