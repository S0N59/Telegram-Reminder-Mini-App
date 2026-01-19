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
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY;
    const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN;

    let databaseStatus = 'not_configured';

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
        
        databaseStatus = error ? 'disconnected' : 'connected';
      } catch {
        databaseStatus = 'error';
      }
    }

    return res.status(200).json({
      status: 'healthy',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      config: {
        supabase: hasSupabaseUrl && hasSupabaseKey,
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
