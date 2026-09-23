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

  const db = getDb();

  // GET /api/contacts?userId=123
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const parsedUserId = telegramUser.id;

      // Fetch friend user IDs and their details using a JOIN
      const result = await db.query(`
        SELECT c.user_id_2 as user_id, b.username, b.first_name, b.last_name
        FROM user_connections c
        LEFT JOIN bot_users b ON c.user_id_2 = b.user_id
        WHERE c.user_id_1 = $1
        ORDER BY b.first_name ASC
      `, [parsedUserId]);

      const contacts = result.rows.map((u: any) => ({
        userId: u.user_id,
        username: u.username,
        firstName: u.first_name || 'Friend',
        lastName: u.last_name,
      }));

      return res.status(200).json(contacts);
    } catch (error) {
      console.error('[CONTACTS] GET Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/contacts - Add contact by username or connect users
  if (req.method === 'POST') {
    try {
      const { userId, targetUsername, targetUserId } = req.body;

      if (!userId || (!targetUsername && !targetUserId)) {
        return res.status(400).json({ error: 'userId and targetUsername/targetUserId are required' });
      }

      const currentUserId = telegramUser.id;
      let targetId = targetUserId ? parseInt(targetUserId) : null;
      let targetUser: any = null;

      // Look up target by username if not provided targetId
      if (!targetId && targetUsername) {
        const cleanUsername = targetUsername.replace(/^@/, '').trim();
        const { rows } = await db.query(
          `SELECT user_id, username, first_name, last_name FROM bot_users WHERE LOWER(username) = LOWER($1)`,
          [cleanUsername]
        );
        if (rows.length > 0) {
          targetUser = rows[0];
          targetId = targetUser.user_id;
        }
      } else if (targetId) {
        const { rows } = await db.query(
          `SELECT user_id, username, first_name, last_name FROM bot_users WHERE user_id = $1`,
          [targetId]
        );
        if (rows.length > 0) {
          targetUser = rows[0];
        }
      }

      const timestamp = Date.now();

      // If user found in bot_users, create two-way connection
      if (targetId && targetId !== currentUserId) {
        await db.query(`
          INSERT INTO user_connections (user_id_1, user_id_2, created_at)
          VALUES ($1, $2, $3), ($2, $1, $3)
          ON CONFLICT DO NOTHING
        `, [currentUserId, targetId, timestamp]);

        return res.status(200).json({
          success: true,
          connected: true,
          contact: {
            userId: targetId,
            username: targetUser?.username || targetUsername?.replace(/^@/, ''),
            firstName: targetUser?.first_name || 'Friend',
            lastName: targetUser?.last_name || null,
          }
        });
      }

      // If user not registered yet in bot_users, return pending contact
      return res.status(200).json({
        success: true,
        connected: false,
        contact: {
          userId: targetId || Date.now(),
          username: targetUsername ? targetUsername.replace(/^@/, '') : null,
          firstName: targetUsername || 'Friend',
          lastName: null,
        }
      });
    } catch (error) {
      console.error('[CONTACTS] POST Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
