import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const parsedUserId = parseInt(userId as string);

    // 1. Fetch friend user IDs from user_connections
    const { data: connections, error: connError } = await supabase
      .from('user_connections')
      .select('user_id_2')
      .eq('user_id_1', parsedUserId);

    if (connError) {
      console.error('[CONTACTS] Error fetching connections:', connError);
      return res.status(500).json({
        error: 'Failed to fetch connections',
        details: connError.message,
      });
    }

    const friendIds = (connections || []).map((c: any) => c.user_id_2);

    let data: any[] = [];
    let error: any = null;

    if (friendIds.length > 0) {
      // 2. Fetch the bot_users details for those IDs
      const { data: fetchedData, error: fetchError } = await supabase
        .from('bot_users')
        .select('user_id, username, first_name, last_name')
        .in('user_id', friendIds)
        .order('first_name', { ascending: true });
      data = fetchedData || [];
      error = fetchError;
    }

    if (error) {
      console.error('[CONTACTS] Error fetching contacts:', error);
      return res.status(500).json({
        error: 'Failed to fetch contacts',
        details: error.message,
      });
    }

    // Transform to camelCase for frontend
    const contacts = (data || []).map((u: any) => ({
      userId: u.user_id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
    }));

    return res.status(200).json(contacts);
  } catch (error) {
    console.error('[CONTACTS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
