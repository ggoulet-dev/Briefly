-- Briefly: Add Supabase Auth with admin/user roles
-- Run this in the Supabase SQL editor

-- ═══════════════════════════════════════════════════════════
-- 1. Add auth columns to users table
-- ═══════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- ═══════════════════════════════════════════════════════════
-- 2. Helper functions for RLS policies
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. Auto-create public.users row on auth.users INSERT
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (email, name, auth_id, role)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    NEW.id,
    'user'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ═══════════════════════════════════════════════════════════
-- 4. Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_articles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- 5. RLS Policies
-- ═══════════════════════════════════════════════════════════

-- ── Users ──────────────────────────────────────────────────

CREATE POLICY "admin_full_access_users" ON users
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "user_read_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "user_update_own" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- ── Topics ─────────────────────────────────────────────────

CREATE POLICY "admin_full_access_topics" ON topics
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "authenticated_read_topics" ON topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── User Topics ────────────────────────────────────────────

CREATE POLICY "admin_full_access_user_topics" ON user_topics
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "user_manage_own_topics" ON user_topics
  FOR ALL USING (user_id = get_user_id());

-- ── Sources ────────────────────────────────────────────────

CREATE POLICY "admin_full_access_sources" ON sources
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "authenticated_read_sources" ON sources
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── Source Topics ──────────────────────────────────────────

CREATE POLICY "admin_full_access_source_topics" ON source_topics
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "authenticated_read_source_topics" ON source_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── Articles ───────────────────────────────────────────────

CREATE POLICY "admin_full_access_articles" ON articles
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "authenticated_read_articles" ON articles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── Briefings ──────────────────────────────────────────────

CREATE POLICY "admin_full_access_briefings" ON briefings
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "user_read_own_briefings" ON briefings
  FOR SELECT USING (user_id = get_user_id());

-- ── Briefing Articles ──────────────────────────────────────

CREATE POLICY "admin_full_access_briefing_articles" ON briefing_articles
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "user_read_own_briefing_articles" ON briefing_articles
  FOR SELECT USING (
    briefing_id IN (
      SELECT id FROM briefings WHERE user_id = get_user_id()
    )
  );
