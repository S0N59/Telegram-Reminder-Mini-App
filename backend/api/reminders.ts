import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Validate environment
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Missing Supabase environment variables',
      });
    }

    // Dynamic import for Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { method } = req;
    const { userId, id } = req.query;

    // GET - Fetch reminders for a user
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
        return res.status(500).json({
          error: 'Failed to fetch reminders',
          details: error.message,
        });
      }

      // Transform to frontend format
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
        confirmRequired: r.confirm_required || false,
        reRemindInterval: r.re_remind_interval || 5,
        confirmed: r.confirmed || false,
        lastSentAt: r.last_sent_at,
      })) || [];

      return res.status(200).json(reminders);
    }

    // POST - Create a new reminder
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
        confirmRequired = false,
        reRemindInterval = 5,
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
        confirm_required: confirmRequired,
        re_remind_interval: reRemindInterval,
        confirmed: false,
        last_sent_at: null,
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: 'Failed to create reminder',
          details: error.message,
        });
      }

      return res.status(201).json({
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
      });
    }

    // PUT - Update a reminder
    if (method === 'PUT') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      const updates: Record<string, any> = {};
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
        return res.status(500).json({
          error: 'Failed to update reminder',
          details: error.message,
        });
      }

      if (!data) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      return res.status(200).json({
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
      });
    }

    // DELETE - Remove a reminder
    if (method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({
          error: 'Failed to delete reminder',
          details: error.message,
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
