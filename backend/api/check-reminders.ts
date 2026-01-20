import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Scheduler endpoint - called by cron-job.org every minute
 * Checks for due reminders and sends Telegram notifications
 * 
 * Improved: Checks a 2-minute window to handle timing delays
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  
  try {
    // API key authentication
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.SCHEDULER_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ error: 'Telegram bot not configured' });
    }

    // Dynamic imports
    const { createClient } = await import('@supabase/supabase-js');
    const { Telegraf } = await import('telegraf');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

    // Get current time in UTC
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    // Build time strings for current minute and previous minute (2-minute window)
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // Also check previous minute to catch any that were missed
    const prevMinute = currentMinute === 0 ? 59 : currentMinute - 1;
    const prevHour = currentMinute === 0 ? (currentHour === 0 ? 23 : currentHour - 1) : currentHour;
    const prevTime = `${String(prevHour).padStart(2, '0')}:${String(prevMinute).padStart(2, '0')}`;
    
    // Also handle date change for previous minute
    let prevDate = currentDate;
    if (currentHour === 0 && currentMinute === 0) {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      prevDate = yesterday.toISOString().split('T')[0];
    }

    console.log(`[CHECK] UTC: ${currentDate} ${currentTime}, also checking: ${prevDate} ${prevTime}`);

    // Fetch reminders for current minute
    const { data: currentReminders, error: err1 } = await supabase
      .from('reminders')
      .select('*')
      .eq('date', currentDate)
      .eq('time', currentTime)
      .eq('done', false)
      .eq('sent', false);

    // Fetch reminders for previous minute (in case cron was delayed)
    const { data: prevReminders, error: err2 } = await supabase
      .from('reminders')
      .select('*')
      .eq('date', prevDate)
      .eq('time', prevTime)
      .eq('done', false)
      .eq('sent', false);

    if (err1 || err2) {
      return res.status(500).json({ 
        error: 'Database error',
        details: err1?.message || err2?.message 
      });
    }

    // Combine and deduplicate reminders
    const allReminders = [...(currentReminders || []), ...(prevReminders || [])];
    const uniqueReminders = allReminders.filter((r, i, arr) => 
      arr.findIndex(x => x.id === r.id) === i
    );

    if (uniqueReminders.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders due',
        checked: { current: currentTime, previous: prevTime },
        timestamp: now.toISOString(),
        duration: `${Date.now() - startTime}ms`
      });
    }

    console.log(`[CHECK] Found ${uniqueReminders.length} reminders to send`);

    let sent = 0;
    let failed = 0;
    const results: string[] = [];

    // Send notifications
    for (const reminder of uniqueReminders) {
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
        results.push(`✅ ${reminder.id}: sent to ${reminder.user_id}`);
      } catch (err) {
        failed++;
        results.push(`❌ ${reminder.id}: ${err instanceof Error ? err.message : 'failed'}`);
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return res.status(200).json({
      checked: uniqueReminders.length,
      sent,
      failed,
      times: { current: currentTime, previous: prevTime },
      results,
      timestamp: now.toISOString(),
      duration: `${Date.now() - startTime}ms`
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: `${Date.now() - startTime}ms`
    });
  }
}
