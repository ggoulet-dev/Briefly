-- Briefly: Add user_sources table for favoriting sources
-- Run this in the Supabase SQL editor

CREATE TABLE user_sources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_id)
);

ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_user_sources" ON user_sources
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "user_manage_own_sources" ON user_sources
  FOR ALL USING (user_id = get_user_id());
