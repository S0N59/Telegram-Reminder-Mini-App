import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createNotionTask, updateNotionTask, updateNotionStatus } from '../services/notion.js';

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

      const parsedUserId = parseInt(userId as string);
      console.log(`[API] Fetching reminders for userId: ${userId} (parsed: ${parsedUserId})`);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .or(`user_id.eq.${parsedUserId},assigned_to_chat_id.eq.${parsedUserId}`)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (!error) {
        console.log(`[API] Found ${data?.length || 0} active reminders for user ${userId}`);
      }

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
        userId: Number(r.user_id),
        done: r.done || false,
        sent: r.sent || false,
        status: r.status || 'todo',
        priority: r.priority || 'MEDIUM',
        repeat: r.repeat_type || 'NONE',
        customWeekdays: r.custom_weekdays,
        resendCount: r.resend_count || 0,
        maxResend: r.max_resend || 3,
        confirmRequired: r.confirm_required || false,
        reRemindInterval: r.re_remind_interval || 5,
        confirmed: r.confirmed || false,
        lastSentAt: r.last_sent_at,
        category: r.category,
        assignedTo: r.assigned_to,
        assignedToChatId: r.assigned_to_chat_id ? Number(r.assigned_to_chat_id) : undefined,
        creatorName: r.creator_name,
        isSentToMe: r.assigned_to_chat_id ? Number(r.assigned_to_chat_id) === parsedUserId : false,
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
        category,
        assignedTo,
        assignedToChatId,
        creatorName,
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
        status: 'todo',
        priority,
        repeat_type: repeat,
        custom_weekdays: customWeekdays,
        resend_count: 0,
        max_resend: 3,
        confirm_required: confirmRequired,
        re_remind_interval: reRemindInterval,
        confirmed: false,
        last_sent_at: null,
        category,
        assigned_to: assignedTo,
        assigned_to_chat_id: assignedToChatId || null,
        creator_name: creatorName || null,
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

      // Fetch user's settings and increment total_created
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('notion_token, notion_database_id, total_created')
        .eq('user_id', data.user_id)
        .single();
        
      const currentCreated = userSettings?.total_created || 0;
      await supabase
        .from('user_settings')
        .upsert({
          user_id: data.user_id,
          total_created: currentCreated + 1,
          updated_at: Date.now()
        }, { onConflict: 'user_id' });

      const creds = userSettings ? {
        notionToken: userSettings.notion_token,
        notionDatabaseId: userSettings.notion_database_id
      } : null;

      // Create Notion task in background
      const notionPageId = await createNotionTask(data, creds);
      if (notionPageId) {
        // Save the ID silently
        const { error: updateError } = await supabase
          .from('reminders')
          .update({ notion_page_id: notionPageId })
          .eq('id', data.id);
          
        if (updateError) {
           console.error('Failed to save notion_page_id to Supabase:', updateError);
        }
      }

      return res.status(201).json({
        id: data.id,
        text: data.text,
        date: data.date,
        time: data.time,
        createdAt: data.created_at,
        userId: Number(data.user_id),
        done: data.done || false,
        sent: data.sent || false,
        status: data.status || 'todo',
        priority: data.priority || 'MEDIUM',
        repeat: data.repeat_type || 'NONE',
        customWeekdays: data.custom_weekdays,
        resendCount: data.resend_count || 0,
        maxResend: data.max_resend || 3,
        category: data.category,
        assignedTo: data.assigned_to,
        assignedToChatId: data.assigned_to_chat_id ? Number(data.assigned_to_chat_id) : undefined,
        creatorName: data.creator_name,
      });
    }

    // PUT - Update a reminder
    if (method === 'PUT') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      const updates: Record<string, any> = {};
      const timeChanged = req.body.date !== undefined || req.body.time !== undefined;

      if (req.body.text !== undefined) updates.text = req.body.text;
      if (req.body.date !== undefined) updates.date = req.body.date;
      if (req.body.time !== undefined) updates.time = req.body.time;
      if (req.body.done !== undefined) updates.done = req.body.done;
      if (req.body.sent !== undefined) updates.sent = req.body.sent;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.priority !== undefined) updates.priority = req.body.priority;
      if (req.body.repeat !== undefined) updates.repeat_type = req.body.repeat;
      if (req.body.customWeekdays !== undefined) {
        updates.custom_weekdays = req.body.customWeekdays;
      }
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.assignedTo !== undefined) updates.assigned_to = req.body.assignedTo;
      if (req.body.assignedToChatId !== undefined) updates.assigned_to_chat_id = req.body.assignedToChatId;
      if (req.body.creatorName !== undefined) updates.creator_name = req.body.creatorName;
      if (req.body.confirmRequired !== undefined) {
        updates.confirm_required = req.body.confirmRequired;
      }
      if (req.body.reRemindInterval !== undefined) {
        updates.re_remind_interval = req.body.reRemindInterval;
      }

      // If date or time changed, reset notification status
      if (timeChanged) {
        updates.sent = false;
        updates.done = false;
        updates.status = 'todo';
        updates.confirmed = false;
        updates.last_sent_at = null;
        updates.resend_count = 0;
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

      if (data.notion_page_id) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('notion_token, notion_database_id')
          .eq('user_id', data.user_id)
          .single();

        const creds = userSettings ? {
          notionToken: userSettings.notion_token,
          notionDatabaseId: userSettings.notion_database_id
        } : null;

        await updateNotionTask(data, creds);
      }

      return res.status(200).json({
        id: data.id,
        text: data.text,
        date: data.date,
        time: data.time,
        createdAt: data.created_at,
        userId: Number(data.user_id),
        done: data.done || false,
        sent: data.sent || false,
        status: data.status || 'todo',
        priority: data.priority || 'MEDIUM',
        repeat: data.repeat_type || 'NONE',
        customWeekdays: data.custom_weekdays,
        resendCount: data.resend_count || 0,
        maxResend: data.max_resend || 3,
        category: data.category,
        assignedTo: data.assigned_to,
        assignedToChatId: data.assigned_to_chat_id ? Number(data.assigned_to_chat_id) : undefined,
        creatorName: data.creator_name,
      });
    }

    // DELETE - Remove a reminder
    if (method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'Reminder id is required' });
      }

      // 1. Get reminder to find notion_page_id before deleting
      const { data: reminder } = await supabase
        .from('reminders')
        .select('notion_page_id, user_id')
        .eq('id', id)
        .single();

      // 2. Sync 'Archive' status to Notion and increment total_deleted
      if (reminder) {
        try {
          const { data: userSettings } = await supabase
            .from('user_settings')
            .select('notion_token, notion_database_id, total_deleted')
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

          const creds = userSettings ? {
            notionToken: userSettings.notion_token,
            notionDatabaseId: userSettings.notion_database_id
          } : null;

          if (reminder.notion_page_id) {
            await updateNotionStatus(reminder.notion_page_id, 'Archive', creds);
          }
        } catch (e) {
          console.error('Failed to sync Archive to Notion or update stats:', e);
        }
      }

      // 3. Delete from Supabase
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
