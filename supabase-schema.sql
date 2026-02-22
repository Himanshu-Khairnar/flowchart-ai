-- ============================================================
-- Flowchart AI — Supabase Schema
-- Run this in: https://supabase.com/dashboard/project/_/sql
--
-- Tables
--   flows              — one row per flowchart, owned by a user
--   flow_collaborators — other users invited to co-edit a flow
-- ============================================================

-- ── 0. Drop old objects (idempotent re-run) ──────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'flows') THEN
    DROP TRIGGER IF EXISTS update_flows_updated_at ON flows;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'flow_collaborators') THEN
    DROP TRIGGER IF EXISTS update_collaborators_updated_at ON flow_collaborators;
  END IF;
END $$;
DROP FUNCTION IF EXISTS update_updated_at_column()  CASCADE;
DROP FUNCTION IF EXISTS is_collaborator(UUID)        CASCADE;
DROP FUNCTION IF EXISTS is_editor_collaborator(UUID) CASCADE;
DROP VIEW     IF EXISTS flow_summaries;
DROP TABLE    IF EXISTS flow_collaborators;
DROP TABLE    IF EXISTS flows;

-- ── 1. flows ─────────────────────────────────────────────────
CREATE TABLE flows (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Untitled Flow',
  description TEXT        NOT NULL DEFAULT '',
  flow_data   JSONB       NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flows_owner_id   ON flows(owner_id);
CREATE INDEX idx_flows_updated_at ON flows(updated_at DESC);

-- ── 2. flow_collaborators ─────────────────────────────────────
--   role: 'viewer' can only read, 'editor' can edit flow_data
CREATE TABLE flow_collaborators (
  flow_id    UUID        NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'editor'
                         CHECK (role IN ('viewer', 'editor')),
  invited_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (flow_id, user_id)
);

CREATE INDEX idx_flow_collab_flow_id ON flow_collaborators(flow_id);
CREATE INDEX idx_flow_collab_user_id ON flow_collaborators(user_id);

-- ── 3. auto-updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. Row Level Security ─────────────────────────────────────
ALTER TABLE flows              ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_collaborators ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a collaborator on this flow?
CREATE OR REPLACE FUNCTION is_collaborator(p_flow_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM flow_collaborators
    WHERE flow_id = p_flow_id
      AND user_id = auth.uid()
  );
$$;

-- Helper: is the calling user an editor-collaborator on this flow?
CREATE OR REPLACE FUNCTION is_editor_collaborator(p_flow_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM flow_collaborators
    WHERE flow_id = p_flow_id
      AND user_id = auth.uid()
      AND role = 'editor'
  );
$$;

-- ── flows policies ────────────────────────────────────────────

-- SELECT: owner | any collaborator | public flow
CREATE POLICY "flows_select"
  ON flows FOR SELECT
  USING (
    owner_id  = auth.uid()        OR
    is_public = true              OR
    is_collaborator(id)
  );

-- INSERT: authenticated users only; they must set themselves as owner
CREATE POLICY "flows_insert"
  ON flows FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner or editor-collaborator
-- WITH CHECK mirrors USING so Supabase doesn't silently reject
-- collaborator updates due to the implicit owner_id constraint.
CREATE POLICY "flows_update"
  ON flows FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    is_editor_collaborator(id)
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    is_editor_collaborator(id)
  );

-- DELETE: owner only
CREATE POLICY "flows_delete"
  ON flows FOR DELETE
  USING (owner_id = auth.uid());

-- ── flow_collaborators policies ───────────────────────────────

-- SELECT: owner of the flow or the collaborator themselves
CREATE POLICY "collaborators_select"
  ON flow_collaborators FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND owner_id = auth.uid())
  );

-- INSERT: only the flow owner can invite collaborators
CREATE POLICY "collaborators_insert"
  ON flow_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND owner_id = auth.uid())
  );

-- UPDATE: only the flow owner can change roles
CREATE POLICY "collaborators_update"
  ON flow_collaborators FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND owner_id = auth.uid())
  );

-- DELETE: owner removes anyone; collaborator removes themselves
CREATE POLICY "collaborators_delete"
  ON flow_collaborators FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM flows WHERE id = flow_id AND owner_id = auth.uid())
  );

-- ── 5. Useful view ────────────────────────────────────────────
CREATE OR REPLACE VIEW flow_summaries AS
SELECT
  f.id,
  f.owner_id,
  f.name,
  f.description,
  f.is_public,
  f.created_at,
  f.updated_at,
  jsonb_array_length(f.flow_data->'nodes') AS node_count,
  jsonb_array_length(f.flow_data->'edges') AS edge_count,
  COUNT(fc.user_id)::INT                   AS collaborator_count
FROM flows f
LEFT JOIN flow_collaborators fc ON fc.flow_id = f.id
GROUP BY f.id;

-- ── 6. User lookup helpers (called by ShareDialog) ───────────
-- Both are SECURITY DEFINER so they can read auth.users without
-- exposing the table directly to the client role.

-- 6a. Resolve an email → user_id
CREATE OR REPLACE FUNCTION lookup_user_by_email(p_email TEXT)
RETURNS TABLE(user_id UUID, user_email TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, email::TEXT
  FROM   auth.users
  WHERE  email = lower(trim(p_email))
  LIMIT  1;
$$;

REVOKE EXECUTE ON FUNCTION lookup_user_by_email(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION lookup_user_by_email(TEXT) TO authenticated;

-- 6b. Get collaborators WITH their emails (owner sees all; others see only themselves)
CREATE OR REPLACE FUNCTION get_flow_collaborators(p_flow_id UUID)
RETURNS TABLE(user_id UUID, role TEXT, created_at TIMESTAMPTZ, email TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT fc.user_id,
         fc.role,
         fc.created_at,
         u.email::TEXT
  FROM   flow_collaborators fc
  JOIN   auth.users u ON u.id = fc.user_id
  WHERE  fc.flow_id = p_flow_id
    AND (
      -- owner sees everyone; collaborator sees only themselves
      EXISTS (SELECT 1 FROM flows f WHERE f.id = p_flow_id AND f.owner_id = auth.uid())
      OR fc.user_id = auth.uid()
    )
  ORDER BY fc.created_at ASC;
$$;

REVOKE EXECUTE ON FUNCTION get_flow_collaborators(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_flow_collaborators(UUID) TO authenticated;

-- ── 7. Comments ───────────────────────────────────────────────
COMMENT ON TABLE  flows                      IS 'One flowchart per row, owned by an authenticated user';
COMMENT ON COLUMN flows.flow_data            IS 'JSONB with nodes[] and edges[] from React Flow';
COMMENT ON COLUMN flows.is_public            IS 'When true, any authenticated user can view (not edit)';
COMMENT ON TABLE  flow_collaborators         IS 'Users invited to view or edit a specific flow';
COMMENT ON COLUMN flow_collaborators.role    IS 'viewer = read-only, editor = can modify flow_data';

-- ── 8. AI Sessions ────────────────────────────────────────────
-- Run this block separately if you already applied sections 1-7.

CREATE TABLE IF NOT EXISTS ai_sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'New Session',
  messages    JSONB       NOT NULL DEFAULT '[]',
  summary     TEXT,
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id    ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_updated_at ON ai_sessions(updated_at DESC);

-- Reuse the existing updated_at trigger function
CREATE OR REPLACE TRIGGER update_ai_sessions_updated_at
  BEFORE UPDATE ON ai_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

-- Owner or public reads
CREATE POLICY "ai_sessions_select" ON ai_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "ai_sessions_insert" ON ai_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_sessions_update" ON ai_sessions FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_sessions_delete" ON ai_sessions FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE  ai_sessions          IS 'AI chat sessions with flowchart generation history';
COMMENT ON COLUMN ai_sessions.messages IS 'JSONB array of {role, content, timestamp} message objects';
COMMENT ON COLUMN ai_sessions.is_public IS 'When true, anyone can read this session (read-only)';
