import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Scheduler endpoint - called by cron-job.org every minute
 * Checks for due reminders and sends Telegram notifications
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // API key authentication
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.SCHEDULER_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({ 
        error: 'Database not configured' 
      });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ 
        error: 'Telegram bot not configured' 
      });
    }

    // Dynamic imports
    const { createClient } = await import('@supabase/supabase-js');
    const { Telegraf } = await import('telegraf');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

    // Get current date/time in UTC
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    // Fetch due reminders
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('date', currentDate)
      .eq('time', currentTime)
      .eq('done', false)
      .eq('sent', false);

    if (error) {
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message 
      });
    }

    if (!reminders || reminders.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders due',
        timestamp: now.toISOString()
      });
    }

    let sent = 0;
    let failed = 0;

    // Send notifications
    for (const reminder of reminders) {
      try {
        await bot.telegram.sendMessage(
          reminder.user_id, 
          `🔔 Напоминание:\n\n${reminder.text}`,
          { parse_mode: 'HTML' }
        );

        // Mark as sent
        await supabase
          .from('reminders')
          .update({ sent: true })
          .eq('id', reminder.id);

        sent++;
      } catch {
        failed++;
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return res.status(200).json({
      checked: reminders.length,
      sent,
      failed,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
