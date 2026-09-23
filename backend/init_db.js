import pg from 'pg';

const { Pool } = pg;

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const sql = `
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
  snoozed_until BIGINT,
  notion_page_id TEXT,
  category TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'todo',
  assigned_to_chat_id BIGINT,
  creator_name TEXT,
  confirm_required BOOLEAN DEFAULT FALSE,
  confirmed BOOLEAN DEFAULT FALSE,
  re_remind_interval INTEGER DEFAULT 5,
  last_sent_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON reminders(date, time);
CREATE INDEX IF NOT EXISTS idx_reminders_done ON reminders(done);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to_chat_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY,
  notion_token TEXT,
  notion_database_id TEXT,
  updated_at BIGINT,
  total_created INTEGER DEFAULT 0,
  total_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bot_users (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  registered_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_bot_users_username ON bot_users(username);

CREATE TABLE IF NOT EXISTS user_connections (
  user_id_1 BIGINT NOT NULL,
  user_id_2 BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id_1, user_id_2)
);

CREATE TABLE IF NOT EXISTS user_channels (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  username TEXT,
  chat_type TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE (user_id, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);
`;

  try {
    console.log('Connecting to database...');
    await pool.query(sql);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}
run();
