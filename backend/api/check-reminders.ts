import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * This endpoint is called by cron-job.org every minute
 * to check for due reminders and send notifications
 * 
 * IMPORTANT: Reminders are stored in USER'S LOCAL TIME (e.g., Armenia UTC+4)
 * The cron runs in UTC, so we convert to user's local time before checking
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
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

    // Helper function to format beautiful notification
    function formatNotification(reminder: { text: string; date: string; time: string }): string {
      const [year, month, day] = reminder.date.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1];
      const formattedDate = `${monthName} ${parseInt(day)}, ${year}`;
      
      return `
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>REMINDER</b>
━━━━━━━━━━━━━━━━━━━━━

📝 <b>${reminder.text}</b>

📅 ${formattedDate}  •  🕐 ${reminder.time}

━━━━━━━━━━━━━━━━━━━━━
✨ <i>Stay on track!</i>
━━━━━━━━━━━━━━━━━━━━━`.trim();
    }

    // Helper function to send Telegram notification
    async function sendTelegramNotification(chatId: number, reminder: { text: string; date: string; time: string }): Promise<boolean> {
      try {
        const message = formatNotification(reminder);
        await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
        });
        return true;
      } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
      }
    }

    // Get current time in UTC
    const nowUTC = new Date();
    
    // Convert to Armenia time (UTC+4)
    // TODO: In future, store user timezone and use per-user conversion
    const USER_TIMEZONE_OFFSET = 4; // Armenia is UTC+4
    const userLocalTime = new Date(nowUTC.getTime() + (USER_TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const currentHour = userLocalTime.getUTCHours();
    const currentMinute = userLocalTime.getUTCMinutes();
    const currentDate = `${userLocalTime.getUTCFullYear()}-${String(userLocalTime.getUTCMonth() + 1).padStart(2, '0')}-${String(userLocalTime.getUTCDate()).padStart(2, '0')}`;
    
    // Check current minute and previous minute to account for cron delays
    const minutesToCheck = [currentMinute];
    if (currentMinute === 0) {
      minutesToCheck.push(59);
    } else {
      minutesToCheck.push(currentMinute - 1);
    }

    const remindersToSend = [];

    for (const minute of minutesToCheck) {
      // Handle hour adjustment for previous minute check
      let checkHour = currentHour;
      if (minute === 59 && currentMinute === 0) {
        checkHour = currentHour === 0 ? 23 : currentHour - 1;
      }
      
      const checkTime = `${String(checkHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('date', currentDate)
        .eq('time', checkTime)
        .eq('done', false)
        .eq('sent', false);

      if (error) {
        console.error('[CHECK-REMINDERS] Supabase error:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch reminders',
          details: error.message 
        });
      }
      
      if (reminders && reminders.length > 0) {
        remindersToSend.push(...reminders);
      }
    }

    // Debug info
    const debugInfo = {
      utcTime: nowUTC.toISOString(),
      userLocalTime: `${currentDate} ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
      timezoneOffset: `UTC+${USER_TIMEZONE_OFFSET}`,
      checkedMinutes: minutesToCheck.map(m => `${String(currentHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    };

    if (remindersToSend.length === 0) {
      return res.status(200).json({ 
        message: 'No reminders due at this time',
        checked: 0,
        sent: 0,
        timestamp: new Date().toISOString(),
        debug: debugInfo
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications for each reminder
    for (const reminder of remindersToSend) {
      try {
        const success = await sendTelegramNotification(
          reminder.user_id,
          { text: reminder.text, date: reminder.date, time: reminder.time }
        );

        if (success) {
          // Mark as sent
          await supabase
            .from('reminders')
            .update({ sent: true })
            .eq('id', reminder.id);

          sentCount++;
        } else {
          failedCount++;
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
      checked: remindersToSend.length,
      sent: sentCount,
      failed: failedCount,
      timestamp: new Date().toISOString(),
      debug: debugInfo
    });
  } catch (error) {
    console.error('[CHECK-REMINDERS] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
