import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize client - will be null if env vars missing, but won't crash on import
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : (() => {
      console.error('⚠️ Supabase client not initialized - missing environment variables');
      return null;
    })() as any;
