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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;
    
    // Handle callback query (button press)
    if (!update.callback_query) {
      return res.status(200).json({ ok: true });
    }

    const callbackQuery = update.callback_query;
    const data = callbackQuery.data || '';
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;
    const callbackId = callbackQuery.id;

    if (!data || !chatId || !messageId) {
      await answerCallback(callbackId, '❌ Error');
      return res.status(200).json({ ok: true });
    }

    // Parse: "action_reminderId"
    const parts = data.split('_');
    const action = parts[0];
    const reminderId = parts[1];

    if (!reminderId) {
      await answerCallback(callbackId, '❌ Invalid');
      return res.status(200).json({ ok: true });
    }

    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    if (action === 'confirm') {
      // Mark as confirmed and done (stops re-sending)
      await supabase
        .from('reminders')
        .update({ confirmed: true, done: true })
        .eq('id', reminderId);

      // Answer callback
      await answerCallback(callbackId, '✅ Confirmed!');

      // Update message with Delete button
      await editMessage(chatId, messageId, '✅ <b>CONFIRMED!</b>', {
        inline_keyboard: [[{ text: '🗑️ Delete', callback_data: `delete_${reminderId}` }]]
      });

    } else if (action === 'delete') {
      // Delete from database
      await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      // Answer callback first
      await answerCallback(callbackId, '🗑️ Deleted!');

      // Try to delete message
      const deleted = await deleteMessage(chatId, messageId);
      
      // If can't delete, edit it instead
      if (!deleted) {
        await editMessage(chatId, messageId, '🗑️ <i>Deleted</i>');
      }

    } else {
      await answerCallback(callbackId, '❓ Unknown');
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return res.status(200).json({ ok: true });
  }
}
