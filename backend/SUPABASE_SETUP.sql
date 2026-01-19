-- Supabase Setup SQL
-- Run this in your Supabase SQL Editor

-- 1. Create the reminders table (if not exists)
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'MEDIUM',
  repeat_type TEXT DEFAULT 'NONE',
  custom_weekdays INTEGER[],
  resend_count INTEGER DEFAULT 0,
  max_resend INTEGER DEFAULT 3,
  next_run_at BIGINT,
  snoozed_until BIGINT
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(date, time);
CREATE INDEX IF NOT EXISTS idx_reminders_done ON reminders(done);

-- 3. Disable RLS (simplest approach for this app)
-- Since the backend uses the anon key and we control all access through our API
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;

-- OR if you prefer to keep RLS enabled, use these policies instead:
-- ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Enable all operations for anon" ON reminders
--   FOR ALL
--   TO anon
--   USING (true)
--   WITH CHECK (true);
