import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // --- Register user in bot_users on ANY interaction ---
    const { createClient: createSupaClient } = await import('@supabase/supabase-js');
    const supa = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
      ? createSupaClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      : null;

    const fromUser = update.message?.from || update.callback_query?.from;
    let registerPromise: Promise<void> | null = null;
    if (supa && fromUser?.id) {
      registerPromise = (async () => {
        try {
          const { error } = await supa.from('bot_users').upsert({
            user_id: fromUser.id,
            username: fromUser.username || null,
            first_name: fromUser.first_name || null,
            last_name: fromUser.last_name || null,
            registered_at: Date.now()
          }, { onConflict: 'user_id' });
          if (error) {
            console.error('[WEBHOOK] bot_users upsert error:', error);
          } else {
            console.log(`[WEBHOOK] Registered/updated bot_user ${fromUser.id} (@${fromUser.username})`);
          }
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
      
      const startParam = text.split(' ')[1] || ''; // e.g. "add_12345"
      
      if (startParam.startsWith('add_')) {
        const inviterIdStr = startParam.substring(4);
        const inviterId = parseInt(inviterIdStr);
        const inviteeId = fromUserObj?.id;
        
        if (inviteeId && !isNaN(inviterId) && inviterId !== inviteeId) {
          // Wait for the invitee to be registered in bot_users first (to avoid foreign key reference errors)
          if (registerPromise) {
            await registerPromise;
          }
          
          if (supa) {
            try {
              // 1. Fetch inviter information to send messages to both and construct the notification
              const { data: inviterUser } = await supa
                .from('bot_users')
                .select('username, first_name, last_name')
                .eq('user_id', inviterId)
                .single();
              
              // 2. Insert bidirectional connections
              const timestamp = Date.now();
              const { error: connError } = await supa.from('user_connections').upsert([
                { user_id_1: inviterId, user_id_2: inviteeId, created_at: timestamp },
                { user_id_1: inviteeId, user_id_2: inviterId, created_at: timestamp }
              ], { onConflict: 'user_id_1,user_id_2' });
              
              if (connError) {
                console.error('[WEBHOOK] Connection upsert error:', connError);
              } else {
                // 3. Inform the Invitee (current user)
                const inviterName = inviterUser
                  ? (inviterUser.username ? `@${inviterUser.username}` : `${inviterUser.first_name || 'Friend'}`)
                  : 'Friend';
                
                const inviteeName = fromUserObj.username
                  ? `@${fromUserObj.username}`
                  : `${fromUserObj.first_name || 'Friend'}`;
                
                // Send connection success to Invitee
                const inviteeAPI = `https://api.telegram.org/bot${token}/sendMessage`;
                await fetch(inviteeAPI, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: inviteeId,
                    text: `🎉 <b>Connected!</b> You are now connected with ${inviterName}.\n\n` +
                          `You can now select each other in the Contact Picker and send reminders!`,
                    parse_mode: 'HTML'
                  })
                });
                
                // 4. Inform the Inviter (the one who sent the link)
                // Send connection success to Inviter
                const inviterAPI = `https://api.telegram.org/bot${token}/sendMessage`;
                await fetch(inviterAPI, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: inviterId,
                    text: `🎉 <b>New Contact!</b> ${inviteeName} has accepted your invite and is now in your contacts.\n\n` +
                          `You can now send them reminders using the Mini App!`,
                    parse_mode: 'HTML'
                  })
                });
                
                return res.status(200).json({ ok: true });
              }
            } catch (err) {
              console.error('[WEBHOOK] Error creating connection:', err);
            }
          }
        }
      }
      
      // Default /start message if not deep linking or if it failed
      const API = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 Hey ${firstName}! Welcome to Reminder Bot.\n\n` +
                `You can now receive reminders from other users.\n` +
                `Open the Mini App to create and manage your reminders.`,
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

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

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
      const updateData: any = { 
        confirmed: statusValue !== 'todo',
        done: statusValue === 'done',
        status: statusValue
      };

      const { data: updatedReminder, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', reminderId)
        .select()
        .single();

      if (error) {
        console.error('[WEBHOOK] Supabase update error:', error);
        await answerCallback(token, callbackId, '❌ DB Error');
        return res.status(200).json({ ok: true });
      }

      if (updatedReminder) {
        await answerCallback(token, callbackId, statusValue === 'in_progress' ? '🟡 In Progress' : '🟢 Done');
        await editMessage(token, chatId, messageId, formatNotification(updatedReminder), getKeyboard(updatedReminder));

        // Background Notion update
        if (updatedReminder.notion_page_id) {
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('notion_token, notion_database_id')
            .eq('user_id', updatedReminder.user_id)
            .single();

          const creds = userSettings ? {
            notionToken: userSettings.notion_token,
            notionDatabaseId: userSettings.notion_database_id
          } : null;

          const { updateNotionStatus } = await import('../services/notion.js');
          const notionStatus = statusValue === 'in_progress' ? 'In Progress' : (statusValue === 'done' ? 'Done' : 'To Do');
          updateNotionStatus(updatedReminder.notion_page_id, notionStatus, creds).catch(e => console.error('Notion error:', e));
        }
      }

    } else if (action === 'delete') {
      // 1. Get notion ID before delete
      const { data: reminder } = await supabase.from('reminders').select('notion_page_id, user_id').eq('id', reminderId).single();

      if (reminder?.notion_page_id) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('notion_token, notion_database_id')
          .eq('user_id', reminder.user_id)
          .single();

        const creds = userSettings ? {
          notionToken: userSettings.notion_token,
          notionDatabaseId: userSettings.notion_database_id
        } : null;

        const { updateNotionStatus } = await import('../services/notion.js');
        updateNotionStatus(reminder.notion_page_id, 'Archive', creds).catch(e => console.error('Notion delete error:', e));
      }

      // 2. Increment total_deleted and Delete from DB
      if (reminder) {
        try {
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('total_deleted')
            .eq('user_id', reminder.user_id)
            .single();

          const currentDeleted = userSettings?.total_deleted || 0;
          await supabase
            .from('user_settings')
            .upsert({
              user_id: reminder.user_id,
              total_deleted: currentDeleted + 1,
              updated_at: Date.now()
            }, { onConflict: 'user_id' });
        } catch (e) {
          console.error('Failed to increment total_deleted in webhook:', e);
        }
      }

      const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
      
      if (error) {
        console.error('[WEBHOOK] Delete error:', error);
        await answerCallback(token, callbackId, '❌ Failed to delete');
      } else {
        await answerCallback(token, callbackId, '🗑️ Deleted');
        const deleted = await deleteMessage(token, chatId, messageId);
        if (!deleted) {
          await editMessage(token, chatId, messageId, '🗑️ <b>Deleted</b>');
        }
      }
    } else if (action === 'edit') {
        // Handle edit action if ever added
        await answerCallback(token, callbackId, '💡 Use the Mini App to edit text', true);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Fatal error:', error);
    return res.status(200).json({ ok: true });
  }
}



