import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * This endpoint is called by cron-job.org every minute
 * to check for due reminders and send notifications
 * 
 * Two types of reminders:
 * 1. SIMPLE - Send once with Delete button
 * 2. CONFIRM - Send with Confirm button, re-send at intervals until confirmed
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

    // Helper function to format notification
    function formatNotification(reminder: { text: string; date: string; time: string }, isReRemind: boolean = false): string {
      const [year, month, day] = reminder.date.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1];
      const formattedDate = `${monthName} ${parseInt(day)}, ${year}`;
      
      const header = isReRemind ? '🔔 <b>REMINDER (Please Confirm!)</b>' : '🔔 <b>REMINDER</b>';
      
      return `${header}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

${reminder.text.toUpperCase()}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

📅 ${formattedDate}   🕐 ${reminder.time}`;
    }

    // Send SIMPLE reminder (Delete button only)
    async function sendSimpleNotification(chatId: number, reminder: { id: string; text: string; date: string; time: string }): Promise<boolean> {
      try {
        const message = formatNotification(reminder);
        await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🗑️ Delete', callback_data: `delete_${reminder.id}` }]
            ]
          }
        });
        return true;
      } catch (error) {
        console.error('Error sending simple notification:', error);
        return false;
      }
    }

    // Send CONFIRM reminder (Confirm button only until confirmed)
    async function sendConfirmNotification(chatId: number, reminder: { id: string; text: string; date: string; time: string }, isReRemind: boolean = false): Promise<boolean> {
      try {
        const message = formatNotification(reminder, isReRemind);
        await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Confirm', callback_data: `confirm_${reminder.id}` }]
            ]
          }
        });
        return true;
      } catch (error) {
        console.error('Error sending confirm notification:', error);
        return false;
      }
    }

    // Get current time
    const nowUTC = new Date();
    const nowTimestamp = nowUTC.getTime();
    
    // Convert to Armenia time (UTC+4)
    const USER_TIMEZONE_OFFSET = 4;
    const userLocalTime = new Date(nowUTC.getTime() + (USER_TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const currentHour = userLocalTime.getUTCHours();
    const currentMinute = userLocalTime.getUTCMinutes();
    const currentDate = `${userLocalTime.getUTCFullYear()}-${String(userLocalTime.getUTCMonth() + 1).padStart(2, '0')}-${String(userLocalTime.getUTCDate()).padStart(2, '0')}`;
    
    // Check current minute and previous minute
    const minutesToCheck = [currentMinute];
    if (currentMinute === 0) {
      minutesToCheck.push(59);
    } else {
      minutesToCheck.push(currentMinute - 1);
    }

    let sentCount = 0;
    let reRemindCount = 0;
    let failedCount = 0;

    // 1. Check for NEW reminders that need to be sent
    for (const minute of minutesToCheck) {
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
        console.error('[CHECK-REMINDERS] Error fetching new reminders:', error);
        continue;
      }
      
      if (reminders && reminders.length > 0) {
        for (const reminder of reminders) {
          try {
            const isConfirmRequired = reminder.confirm_required === true;
            let success = false;
            
            if (isConfirmRequired) {
              // Send with Confirm button
              success = await sendConfirmNotification(
                reminder.user_id,
                { id: reminder.id, text: reminder.text, date: reminder.date, time: reminder.time }
              );
            } else {
              // Send with Delete button only
              success = await sendSimpleNotification(
                reminder.user_id,
                { id: reminder.id, text: reminder.text, date: reminder.date, time: reminder.time }
              );
            }

            if (success) {
              // Mark as sent and record last_sent_at
              await supabase
                .from('reminders')
                .update({ 
                  sent: true,
                  last_sent_at: nowTimestamp
                })
                .eq('id', reminder.id);

              sentCount++;
            } else {
              failedCount++;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`[CHECK-REMINDERS] Error processing reminder ${reminder.id}:`, err);
            failedCount++;
          }
        }
      }
    }

    // 2. Check for CONFIRM reminders that need RE-SENDING
    const { data: confirmReminders, error: confirmError } = await supabase
      .from('reminders')
      .select('*')
      .eq('confirm_required', true)
      .eq('confirmed', false)
      .eq('done', false)
      .eq('sent', true);

    if (!confirmError && confirmReminders && confirmReminders.length > 0) {
      for (const reminder of confirmReminders) {
        try {
          const lastSentAt = reminder.last_sent_at || 0;
          const reRemindInterval = (reminder.re_remind_interval || 5) * 60 * 1000; // Convert to ms
          const timeSinceLastSend = nowTimestamp - lastSentAt;

          // Check if it's time to re-send
          if (timeSinceLastSend >= reRemindInterval) {
            const success = await sendConfirmNotification(
              reminder.user_id,
              { id: reminder.id, text: reminder.text, date: reminder.date, time: reminder.time },
              true // isReRemind
            );

            if (success) {
              // Update last_sent_at
              await supabase
                .from('reminders')
                .update({ last_sent_at: nowTimestamp })
                .eq('id', reminder.id);

              reRemindCount++;
            } else {
              failedCount++;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.error(`[CHECK-REMINDERS] Error re-sending reminder ${reminder.id}:`, err);
          failedCount++;
        }
      }
    }

    return res.status(200).json({
      message: 'Reminder check completed',
      newSent: sentCount,
      reReminded: reRemindCount,
      failed: failedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CHECK-REMINDERS] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
