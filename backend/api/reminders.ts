import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';
import { createNotionTask, updateNotionTask, updateNotionStatus } from '../services/notion.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = getDb();
    const { method } = req;
    const { userId, id } = req.query;

    if (method === 'GET') {
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const parsedUserId = parseInt(userId as string);
      
      const { rows } = await db.query(`
        SELECT * FROM reminders 
        WHERE user_id = $1 OR assigned_to_chat_id = $1
        ORDER BY date ASC, time ASC
      `, [parsedUserId]);

      const reminders = rows.map((r: any) => ({
        id: r.id,
        text: r.text,
        date: r.date,
        time: r.time,
        createdAt: Number(r.created_at),
        userId: Number(r.user_id),
        done: r.done || false,
        sent: r.sent || false,
        status: r.status || 'todo',
        priority: r.priority || 'MEDIUM',
        repeat: r.repeat_type || 'NONE',
        customWeekdays: r.custom_weekdays,
        resendCount: r.resend_count || 0,
        maxResend: r.max_resend || 3,
        confirmRequired: r.confirm_required || false,
        reRemindInterval: r.re_remind_interval || 5,
        confirmed: r.confirmed || false,
        lastSentAt: r.last_sent_at ? Number(r.last_sent_at) : null,
        category: r.category,
        assignedTo: r.assigned_to,
        assignedToChatId: r.assigned_to_chat_id ? Number(r.assigned_to_chat_id) : undefined,
        creatorName: r.creator_name,
        isSentToMe: r.assigned_to_chat_id ? Number(r.assigned_to_chat_id) === parsedUserId : false,
      }));
      return res.status(200).json(reminders);
    }

    if (method === 'POST') {
      const {
        id: bodyId, text, date, time, userId: bodyUserId, priority = 'MEDIUM',
        repeat = 'NONE', customWeekdays, confirmRequired = false, reRemindInterval = 5,
        category, assignedTo, assignedToChatId, creatorName,
      } = req.body;

      if (!text || !date || !time || !bodyUserId) {
        return res.status(400).json({ error: 'Missing required fields: text, date, time, userId' });
      }

      let resolvedChatId = assignedToChatId ? Number(assignedToChatId) : null;
      if (!resolvedChatId && assignedTo) {
        const cleanUser = assignedTo.replace(/^@/, '').trim();
        const { rows: uRows } = await db.query(
          `SELECT user_id FROM bot_users WHERE LOWER(username) = LOWER($1)`,
          [cleanUser]
        );
        if (uRows.length > 0) {
          resolvedChatId = Number(uRows[0].user_id);
          // Also automatically add to user_connections
          const timestamp = Date.now();
          await db.query(`
            INSERT INTO user_connections (user_id_1, user_id_2, created_at)
            VALUES ($1, $2, $3), ($2, $1, $3)
            ON CONFLICT DO NOTHING
          `, [bodyUserId, resolvedChatId, timestamp]);
        }
      }

      const reminder = {
        id: bodyId || Date.now().toString(),
        text: text.trim(),
        date, time,
        user_id: bodyUserId,
        created_at: Date.now(),
        done: false, sent: false, status: 'todo', priority,
        repeat_type: repeat, custom_weekdays: customWeekdays || null,
        resend_count: 0, max_resend: 3, confirm_required: confirmRequired,
        re_remind_interval: reRemindInterval, confirmed: false, last_sent_at: null,
        category: category || null, assigned_to: assignedTo || null,
        assigned_to_chat_id: resolvedChatId, creator_name: creatorName || null,
      };

      await db.query(`
        INSERT INTO reminders (
          id, text, date, time, user_id, created_at, done, sent, status, priority,
          repeat_type, custom_weekdays, resend_count, max_resend, confirm_required,
          re_remind_interval, confirmed, last_sent_at, category, assigned_to, assigned_to_chat_id, creator_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
      `, [
        reminder.id, reminder.text, reminder.date, reminder.time, reminder.user_id, reminder.created_at, reminder.done, reminder.sent, reminder.status, reminder.priority,
        reminder.repeat_type, reminder.custom_weekdays, reminder.resend_count, reminder.max_resend, reminder.confirm_required,
        reminder.re_remind_interval, reminder.confirmed, reminder.last_sent_at, reminder.category, reminder.assigned_to, reminder.assigned_to_chat_id, reminder.creator_name
      ]);

      const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id, total_created FROM user_settings WHERE user_id = $1`, [reminder.user_id]);
      const userSettings = usRows[0];
      const currentCreated = userSettings?.total_created || 0;
      
      await db.query(`
        INSERT INTO user_settings (user_id, total_created, updated_at) 
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET total_created = $2, updated_at = $3
      `, [reminder.user_id, currentCreated + 1, Date.now()]);

      const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
      const notionPageId = await createNotionTask(reminder, creds);
      
      if (notionPageId) {
        await db.query(`UPDATE reminders SET notion_page_id = $1 WHERE id = $2`, [notionPageId, reminder.id]);
      }

      return res.status(201).json({ ...reminder, createdAt: reminder.created_at, userId: Number(reminder.user_id) });
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Reminder id is required' });
      const reqBody = req.body;
      const timeChanged = reqBody.date !== undefined || reqBody.time !== undefined;

      const { rows: oldRows } = await db.query(`SELECT * FROM reminders WHERE id = $1`, [id]);
      if (oldRows.length === 0) return res.status(404).json({ error: 'Reminder not found' });
      let data = oldRows[0];

      if (timeChanged) {
        data.sent = false; data.done = false; data.status = 'todo'; data.confirmed = false;
        data.last_sent_at = null; data.resend_count = 0;
      }
      
      const fields = [
        'text', 'date', 'time', 'done', 'sent', 'status', 'priority', 'repeat_type',
        'custom_weekdays', 'category', 'assigned_to', 'assigned_to_chat_id', 'creator_name',
        'confirm_required', 're_remind_interval', 'confirmed', 'last_sent_at', 'resend_count'
      ];

      for (const field of fields) {
        const reqField = field === 'repeat_type' ? 'repeat' : field.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (reqBody[reqField] !== undefined) data[field] = reqBody[reqField];
      }

      await db.query(`
        UPDATE reminders SET
          text=$1, date=$2, time=$3, done=$4, sent=$5, status=$6, priority=$7, repeat_type=$8,
          custom_weekdays=$9, category=$10, assigned_to=$11, assigned_to_chat_id=$12, creator_name=$13,
          confirm_required=$14, re_remind_interval=$15, confirmed=$16, last_sent_at=$17, resend_count=$18
        WHERE id=$19
      `, [
        data.text, data.date, data.time, data.done, data.sent, data.status, data.priority, data.repeat_type,
        data.custom_weekdays, data.category, data.assigned_to, data.assigned_to_chat_id, data.creator_name,
        data.confirm_required, data.re_remind_interval, data.confirmed, data.last_sent_at, data.resend_count,
        id
      ]);

      if (data.notion_page_id) {
        const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id FROM user_settings WHERE user_id = $1`, [data.user_id]);
        const userSettings = usRows[0];
        const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
        await updateNotionTask(data, creds);
      }

      // Sync Telegram bot message if it was sent
      if (data.sent && data.telegram_message_id) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
          try {
            const chatId = data.assigned_to_chat_id || data.user_id;
            const messageId = data.telegram_message_id;
            
            const statusMap: any = { 'todo': { label: 'To Do', emoji: '⚪' }, 'in_progress': { label: 'In Progress', emoji: '🟡' }, 'done': { label: 'Done', emoji: '🟢' } };
            const status = statusMap[data.status || (data.done ? 'done' : 'todo')] || statusMap['todo'];
            const smartTime = `${data.date} at ${data.time}`;
            const messageText = `🔔 <b>REMINDER</b>\n\n📝 <b>${data.text}</b>\n\n📌 Status: ${status.emoji} ${status.label}\n⏰ ${smartTime}\n⚡ Priority: ${data.priority || 'MEDIUM'}\n` +
              (data.assigned_to_chat_id && data.creator_name ? `\n📨 From: ${data.creator_name}\n` : '') + `\n━━━━━━━━━━━━━━━`;
            
            const editBtn = { text: '📝 Edit', callback_data: `edit_${data.id}` };
            const deleteBtn = { text: '❌ Delete', callback_data: `delete_${data.id}` };
            let keyboard: any = { inline_keyboard: [ [{ text: '🟡 In Progress', callback_data: `status_progress_${data.id}` }], [editBtn, deleteBtn] ] };
            if (data.status === 'done' || data.done) keyboard = { inline_keyboard: [ [editBtn, deleteBtn] ] };
            else if (data.status === 'in_progress') keyboard = { inline_keyboard: [ [{ text: '🟢 Done', callback_data: `status_done_${data.id}` }], [editBtn, deleteBtn] ] };

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: messageText, parse_mode: 'HTML', reply_markup: keyboard })
            });
          } catch (e) {
            console.error('Failed to sync Telegram bot message for PUT', e);
          }
        }
      }

      return res.status(200).json({
        id: data.id, text: data.text, date: data.date, time: data.time, createdAt: Number(data.created_at),
        userId: Number(data.user_id), done: data.done, sent: data.sent, status: data.status, priority: data.priority,
        repeat: data.repeat_type, customWeekdays: data.custom_weekdays, resendCount: data.resend_count,
        maxResend: data.max_resend, category: data.category, assignedTo: data.assigned_to,
        assignedToChatId: data.assigned_to_chat_id ? Number(data.assigned_to_chat_id) : undefined, creatorName: data.creator_name
      });
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Reminder id is required' });
      const { rows } = await db.query(`SELECT * FROM reminders WHERE id = $1`, [id]);
      const reminder = rows[0];

      if (reminder) {
        try {
          const { rows: usRows } = await db.query(`SELECT notion_token, notion_database_id, total_deleted FROM user_settings WHERE user_id = $1`, [reminder.user_id]);
          const userSettings = usRows[0];
          const currentDeleted = userSettings?.total_deleted || 0;

          await db.query(`
            INSERT INTO user_settings (user_id, total_deleted, updated_at) 
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE SET total_deleted = $2, updated_at = $3
          `, [reminder.user_id, currentDeleted + 1, Date.now()]);

          const creds = userSettings ? { notionToken: userSettings.notion_token, notionDatabaseId: userSettings.notion_database_id } : null;
          if (reminder.notion_page_id) await updateNotionStatus(reminder.notion_page_id, 'Archive', creds);
          
          if (reminder.sent && reminder.telegram_message_id) {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (token) {
              const chatId = reminder.assigned_to_chat_id || reminder.user_id;
              await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: reminder.telegram_message_id })
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.error('Failed to sync Archive to Notion or Telegram', e);
        }
      }

      await db.query(`DELETE FROM reminders WHERE id = $1`, [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
