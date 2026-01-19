import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Health check endpoint
 * Used to verify the API is working and database is accessible
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Check environment variables
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY;
    const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN;

    // Try to test database connection if env vars are present
    let databaseStatus = 'not_configured';
    let dbError = null;

    if (hasSupabaseUrl && hasSupabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!
        );
        const { error } = await supabase
          .from('reminders')
          .select('id')
          .limit(1);
        
        if (error) {
          databaseStatus = 'disconnected';
          dbError = error.message;
        } else {
          databaseStatus = 'connected';
        }
      } catch (err) {
        databaseStatus = 'error';
        dbError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    const response: any = {
      status: 'healthy',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl,
        hasSupabaseKey,
        hasBotToken,
      },
    };

    if (dbError) {
      response.databaseError = dbError;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
