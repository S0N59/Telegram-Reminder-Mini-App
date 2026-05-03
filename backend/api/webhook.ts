import type { VercelRequest, VercelResponse } from '@vercel/node';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Direct Telegram API calls (more reliable than Telegraf in serverless)
async function answerCallback(callbackId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

async function deleteMessage(chatId: number, messageId: number): Promise<boolean> {
  const res = await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId })
  });
  return res.ok;
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<boolean> {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

// Helpers for formatting (keep in sync with check-reminders.ts)
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
         `⚡ Priority: ${reminder.priority || 'MEDIUM'}\n\n` +
         `━━━━━━━━━━━━━━━`;
}

function getKeyboard(reminder: any) {
  const currentStatus = reminder.status || (reminder.done ? 'done' : 'todo');

  if (currentStatus === 'done') {
    return {
      inline_keyboard: [
        [{ text: '❌ Delete', callback_data: `delete_${reminder.id}` }]
      ]
    };
  }

  if (currentStatus === 'in_progress') {
    return {
      inline_keyboard: [
        [{ text: '🟢 Done', callback_data: `status_done_${reminder.id}` }],
        [{ text: '❌ Delete', callback_data: `delete_${reminder.id}` }]
      ]
    };
  }

  // Default: todo
  return {
    inline_keyboard: [
      [{ text: '🟡 In Progress', callback_data: `status_progress_${reminder.id}` }],
      [{ text: '❌ Delete', callback_data: `delete_${reminder.id}` }]
    ]
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    const update = req.body;
    if (!update.callback_query) return res.status(200).json({ ok: true });

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data || '';
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;
    const callbackId = callbackQuery.id;

    if (!data || !chatId || !messageId) {
      await answerCallback(callbackId, '❌ Error');
      return res.status(200).json({ ok: true });
    }

    const parts = data.split('_');
    const action = parts[0]; 
    let reminderId = '';
    let statusValue = '';

    if (action === 'status') {
      const subAction = parts[1];
      statusValue = subAction === 'progress' ? 'in_progress' : subAction;
      reminderId = parts.slice(2).join('_');
    } else {
      reminderId = parts.slice(1).join('_');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

    if (action === 'status') {
      const updateData: any = { 
        confirmed: statusValue !== 'todo',
        done: statusValue === 'done'
      };
      
      // Try to update status if column exists (optional since we don't know for sure)
      // For now we assume it exists because we requested it.
      updateData.status = statusValue;

      const { data: updatedReminder, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', reminderId)
        .select()
        .single();

      if (error) {
        console.error('[WEBHOOK] Supabase error:', error);
        // Fallback update if status column is missing
        if (error.message?.includes('column "status" of relation "reminders" does not exist')) {
          const { data: fallbackRem } = await supabase
            .from('reminders')
            .update({ 
              confirmed: updateData.confirmed,
              done: updateData.done
            })
            .eq('id', reminderId)
            .select()
            .single();
          
          if (fallbackRem) {
            await answerCallback(callbackId, '🟡 Updated (Legacy mode)');
            await editMessage(chatId, messageId, formatNotification(fallbackRem), getKeyboard(fallbackRem));
            return res.status(200).json({ ok: true });
          }
        }
        await answerCallback(callbackId, '❌ Error updating');
        return res.status(200).json({ ok: true });
      }

      if (updatedReminder) {
        if (updatedReminder.notion_page_id) {
          try {
            const { updateNotionStatus } = await import('../services/notion.js');
            const notionStatus = statusValue === 'in_progress' ? 'In Progress' : (statusValue === 'done' ? 'Done' : 'To Do');
            await updateNotionStatus(updatedReminder.notion_page_id, notionStatus);
          } catch (e) {}
        }

        await answerCallback(callbackId, statusValue === 'todo' ? '🔄 Reopened' : (statusValue === 'in_progress' ? '🟡 In Progress' : '🟢 Done'));
        await editMessage(chatId, messageId, formatNotification(updatedReminder), getKeyboard(updatedReminder));
      }

    } else if (action === 'delete') {
      // 1. Get reminder to find notion_page_id before deleting
      const { data: reminder } = await supabase
        .from('reminders')
        .select('notion_page_id')
        .eq('id', reminderId)
        .single();

      // 2. Sync 'Archive' status to Notion
      if (reminder?.notion_page_id) {
        try {
          const { updateNotionStatus } = await import('../services/notion.js');
          await updateNotionStatus(reminder.notion_page_id, 'Archive');
        } catch (e) {
          console.error('[WEBHOOK] Failed to sync Archive to Notion:', e);
        }
      }

      // 3. Delete from Supabase
      const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
      
      if (error) {
        await answerCallback(callbackId, '❌ Error deleting');
        return res.status(200).json({ ok: true });
      }

      await answerCallback(callbackId, '🗑️ Deleted');
      
      // 4. Update Telegram UI
      if (!await deleteMessage(chatId, messageId)) {
        await editMessage(chatId, messageId, '🗑️ <b>Deleted (Archived in Notion)</b>');
      }

    } else if (action === 'progress' || action === 'confirm' || action === 'done') {
      // Legacy support for older messages
      const isDone = action === 'done';
      const { data: rem } = await supabase.from('reminders')
        .update({ 
          confirmed: true, 
          done: isDone,
          status: isDone ? 'done' : 'in_progress'
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (rem) {
        await answerCallback(callbackId, isDone ? '🟢 Done' : '🟡 In Progress');
        await editMessage(chatId, messageId, formatNotification(rem), getKeyboard(rem));
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(200).json({ ok: true });
  }
}


