import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Health check endpoint
 * Verifies API is working and database is accessible
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  try {
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN;

    let databaseStatus = 'not_configured';

    if (hasDbUrl) {
      try {
        const { getDb } = await import('./db.js');
        const db = getDb();
        await db.query('SELECT 1');
        databaseStatus = 'connected';
        
        const users = await db.query('SELECT * FROM bot_users');
        const connections = await db.query('SELECT * FROM user_connections');
        databaseStatus = { users: users.rows, connections: connections.rows } as any;
      } catch (err: any) {
        databaseStatus = err.message;
      }
    }

    return res.status(200).json({
      status: 'healthy',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      config: {
        database: hasDbUrl,
        telegram: hasBotToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
