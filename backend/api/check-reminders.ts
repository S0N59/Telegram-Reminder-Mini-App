import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * This endpoint is called by GitHub Actions scheduler every minute
 * to check for due reminders and send notifications
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    console.log('[CHECK-REMINDERS] Handler called');

    // Optional: Add API key authentication for security
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.SCHEDULER_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if required env vars are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({ 
        error: 'Database not configured',
        message: 'Missing Supabase environment variables' 
      });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ 
        error: 'Telegram bot not configured',
        message: 'Missing TELEGRAM_BOT_TOKEN environment variable' 
      });
    }

    // Dynamic imports to avoid module initialization issues
    const { createClient } = await import('@supabase/supabase-js');
    const { Telegraf } = await import('telegraf');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

    // Helper function to send Telegram notification
    async function sendTelegramNotification(chatId: number, text: string): Promise<boolean> {
      try {
        await bot.telegram.sendMessage(chatId, `🔔 Напоминание:\n\n${text}`, {
          parse_mode: 'HTML',
        });
        return true;
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
      }
    }

    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[CHECK-REMINDERS] Checking for ${currentDate} ${currentTime}`);

    // Get all reminders that are due now and not done
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('date', currentDate)
      .eq('time', currentTime)
      .eq('done', false)
      .eq('sent', false);

    if (error) {
      console.error('[CHECK-REMINDERS] Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch reminders',
        details: error.message 
      });
    }

    if (!reminders || reminders.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders due at this time',
        checked: 0,
        sent: 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[CHECK-REMINDERS] Found ${reminders.length} reminders to send`);

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications for each reminder
    for (const reminder of reminders) {
      try {
        const success = await sendTelegramNotification(
          reminder.user_id,
          reminder.text
        );

        if (success) {
          // Mark as sent
          await supabase
            .from('reminders')
            .update({ sent: true })
            .eq('id', reminder.id);

          sentCount++;
          console.log(`[CHECK-REMINDERS] ✅ Sent: ${reminder.text} to user ${reminder.user_id}`);
        } else {
          failedCount++;
          console.error(`[CHECK-REMINDERS] ❌ Failed: ${reminder.text}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`[CHECK-REMINDERS] Error processing reminder ${reminder.id}:`, err);
        failedCount++;
      }
    }

    return res.status(200).json({
      message: 'Reminder check completed',
      checked: reminders.length,
      sent: sentCount,
      failed: failedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CHECK-REMINDERS] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
