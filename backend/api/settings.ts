import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = getDb();
    const { method } = req;
    const { userId } = req.query;

    if (method === 'GET') {
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      
      const { rows } = await db.query(`SELECT * FROM user_settings WHERE user_id = $1`, [parseInt(userId as string)]);
      return res.status(200).json(rows[0] || {});
    }

    if (method === 'POST') {
      const { userId: bodyUserId, notionToken, notionDatabaseId } = req.body;
      const idToUse = userId || bodyUserId;
      if (!idToUse) return res.status(400).json({ error: 'userId is required' });

      const parsedId = parseInt(idToUse as string);
      
      const { rows } = await db.query(`
        INSERT INTO user_settings (user_id, notion_token, notion_database_id, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET 
          notion_token = $2, 
          notion_database_id = $3, 
          updated_at = $4
        RETURNING *
      `, [parsedId, notionToken || null, notionDatabaseId || null, Date.now()]);

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
