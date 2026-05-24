import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { method } = req;
    const { userId } = req.query;

    if (method === 'GET') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', parseInt(userId as string))
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        return res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
      }

      return res.status(200).json(data || {});
    }

    if (method === 'POST') {
      const { userId: bodyUserId, notionToken, notionDatabaseId } = req.body;
      const idToUse = userId || bodyUserId;

      if (!idToUse) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: parseInt(idToUse as string),
          notion_token: notionToken || null,
          notion_database_id: notionDatabaseId || null,
          updated_at: Date.now()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to save settings', details: error.message });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
