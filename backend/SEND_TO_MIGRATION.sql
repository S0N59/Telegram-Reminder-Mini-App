-- Send To Someone — Database Migration
-- Run this in your Supabase SQL Editor

-- 1. Create bot_users table to track all users who have interacted with the bot
CREATE TABLE IF NOT EXISTS bot_users (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  registered_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_bot_users_username ON bot_users(username);
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

-- 2. Add new columns to reminders table for "Send To" feature
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS assigned_to_chat_id BIGINT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- 3. Index for fetching reminders assigned to a specific user
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to_chat_id);
