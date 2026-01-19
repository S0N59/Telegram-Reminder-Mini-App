import type { VercelRequest, VercelResponse } from '@vercel/node';

// Top-level error handler to catch module initialization errors
process.on('uncaughtException', (error) => {
  console.error('[REMINDERS] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[REMINDERS] Unhandled Rejection:', reason);
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Log at the very start - before any other code
  try {
    console.log('[REMINDERS] START - Handler invoked', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  } catch (logError) {
    // Even logging can fail, so we need to return an error response
    return res.status(500).json({
      error: 'Failed to initialize handler',
      message: logError instanceof Error ? logError.message : 'Unknown error'
    });
  }

  try {

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Check environment variables
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY;

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.error('[REMINDERS] Missing Supabase env vars');
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Missing Supabase environment variables',
      });
    }

    // Dynamic import to avoid module initialization issues (same pattern as health.ts)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { method } = req;
    const { userId, id } = req.query;

    if (method === 'GET') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', parseInt(userId as string))
        .eq('done', false)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('[REMINDERS] Supabase error:', error);
        return res.status(500).json({
          error: 'Failed to fetch reminders',
          details: error.message,
        });
      }

      // Transform database format to frontend format
      const reminders = data?.map((r: any) => ({
        id: r.id,
        text: r.text,
        date: r.date,
        time: r.time,
        createdAt: r.created_at,
        userId: r.user_id,
        done: r.done || false,
        sent: r.sent || false,
        priority: r.priority || 'MEDIUM',
        repeat: r.repeat_type || 'NONE',
        customWeekdays: r.custom_weekdays,
        resendCount: r.resend_count || 0,
        maxResend: r.max_resend || 3,
        nextRunAt: r.next_run_at,
        snoozedUntil: r.snoozed_until,
      })) || [];

      return res.status(200).json(reminders);
    }

    if (method === 'POST') {
      const {
        id,
        text,
        date,
        time,
        userId,
        priority = 'MEDIUM',
        repeat = 'NONE',
        customWeekdays,
      } = req.body;

      if (!text || !date || !time || !userId) {
        return res.status(400).json({
          error: 'Missing required fields: text, date, time, userId',
        });
      }

      const reminder = {
        id: id || Date.now().toString(),
        text: text.trim(),
        date,
        time,
        user_id: userId,
        created_at: Date.now(),
        done: false,
        sent: false,
        priority,
        repeat_type: repeat,
        custom_weekdays: customWeekdays,
        resend_count: 0,
        max_resend: 3,
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      if (error) {
        console.error('[REMINDERS] Supabase error:', error);
        return res.status(500).json({
          error: 'Failed to create reminder',
          details: error.message,
        });
      }

      const created = {
        id: data.id,
        text: data.text,
        date: data.date,
        time: data.time,
        createdAt: data.created_at,
        userId: data.user_id,
        done: data.done || false,
        sent: data.sent || false,
        priority: data.priority || 'MEDIUM',
        repeat: data.repeat_type || 'NONE',
        customWeekdays: data.custom_weekdays,
        resendCount: data.resend_count || 0,
        maxResend: data.max_resend || 3,
      };

      return res.status(201).json(created);
    }

    if (method === 'PUT') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      const updates: any = {};
      if (req.body.text !== undefined) updates.text = req.body.text;
      if (req.body.date !== undefined) updates.date = req.body.date;
      if (req.body.time !== undefined) updates.time = req.body.time;
      if (req.body.done !== undefined) updates.done = req.body.done;
      if (req.body.sent !== undefined) updates.sent = req.body.sent;
      if (req.body.priority !== undefined) updates.priority = req.body.priority;
      if (req.body.repeat !== undefined) updates.repeat_type = req.body.repeat;
      if (req.body.customWeekdays !== undefined) {
        updates.custom_weekdays = req.body.customWeekdays;
      }

      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[REMINDERS] Supabase error:', error);
        return res.status(500).json({
          error: 'Failed to update reminder',
          details: error.message,
        });
      }

      if (!data) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      const updated = {
        id: data.id,
        text: data.text,
        date: data.date,
        time: data.time,
        createdAt: data.created_at,
        userId: data.user_id,
        done: data.done || false,
        sent: data.sent || false,
        priority: data.priority || 'MEDIUM',
        repeat: data.repeat_type || 'NONE',
        customWeekdays: data.custom_weekdays,
        resendCount: data.resend_count || 0,
        maxResend: data.max_resend || 3,
      };

      return res.status(200).json(updated);
    }

    if (method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[REMINDERS] Supabase error:', error);
        return res.status(500).json({
          error: 'Failed to delete reminder',
          details: error.message,
        });
      }

      return res.status(200).json({ success: true, message: 'Reminder deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[REMINDERS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
