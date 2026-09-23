import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';
import { requireTelegramUser, setApiCors } from '../lib/telegramAuth.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setApiCors(res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const telegramUser = requireTelegramUser(req, res);
  if (!telegramUser) return;

  try {
    const db = getDb();
    const { method } = req;
    const { userId } = req.query;

    if (method === 'GET') {
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      
      // Ensure schema columns exist
      await db.query(`
        ALTER TABLE user_settings 
        ADD COLUMN IF NOT EXISTS total_created INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_completed INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_deleted INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT NULL
      `).catch(() => {});

      const { rows } = await db.query(`SELECT * FROM user_settings WHERE user_id = $1`, [telegramUser.id]);
      return res.status(200).json(rows[0] || {});
    }

    if (method === 'POST') {
      const { userId: bodyUserId, notionToken, notionDatabaseId, totalCreated, totalCompleted, totalDeleted, notificationConfig } = req.body;
      const parsedId = telegramUser.id;
      
      // Ensure schema columns exist
      await db.query(`
        ALTER TABLE user_settings 
        ADD COLUMN IF NOT EXISTS total_created INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_completed INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_deleted INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT NULL
      `).catch(() => {});

      const notificationConfigJson = notificationConfig !== undefined 
        ? (notificationConfig === null ? null : JSON.stringify(notificationConfig))
        : undefined;

      const { rows } = await db.query(`
        INSERT INTO user_settings (user_id, notion_token, notion_database_id, total_created, total_completed, total_deleted, notification_config, updated_at)
        VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 0), COALESCE($6, 0), $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET 
          notion_token = COALESCE($2, user_settings.notion_token), 
          notion_database_id = COALESCE($3, user_settings.notion_database_id),
          total_created = CASE WHEN $4 IS NOT NULL THEN $4 ELSE user_settings.total_created END,
          total_completed = CASE WHEN $5 IS NOT NULL THEN $5 ELSE user_settings.total_completed END,
          total_deleted = CASE WHEN $6 IS NOT NULL THEN $6 ELSE user_settings.total_deleted END,
          notification_config = CASE WHEN $7 IS NOT NULL THEN $7::jsonb ELSE user_settings.notification_config END,
          updated_at = $8
        RETURNING *
      `, [parsedId, notionToken || null, notionDatabaseId || null, totalCreated ?? null, totalCompleted ?? null, totalDeleted ?? null, notificationConfigJson ?? null, Date.now()]);

      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
