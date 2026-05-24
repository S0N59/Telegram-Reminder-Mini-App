-- Friends & Connections System — Database Migration
-- Run this in your Supabase SQL Editor

-- Create user_connections table for bidirectional relationships
CREATE TABLE IF NOT EXISTS user_connections (
  user_id_1 BIGINT REFERENCES bot_users(user_id) ON DELETE CASCADE,
  user_id_2 BIGINT REFERENCES bot_users(user_id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id_1, user_id_2)
);

-- Index for fast lookup of a user's friends
CREATE INDEX IF NOT EXISTS idx_user_connections_1 ON user_connections(user_id_1);

-- Disable Row Level Security since RLS is disabled in other tables for simplicity
ALTER TABLE user_connections DISABLE ROW LEVEL SECURITY;
