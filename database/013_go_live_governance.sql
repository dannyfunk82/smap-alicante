CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key TEXT PRIMARY KEY,
  description_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  rollout_percent INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  environments TEXT[] NOT NULL DEFAULT ARRAY['local','staging','production']::TEXT[],
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_retention_policies (
  policy_key TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  timestamp_column TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 3650),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  last_deleted_rows INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_runs (
  id BIGSERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('dry_run','execute')),
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_rows INTEGER NOT NULL DEFAULT 0,
  run_by UUID REFERENCES users(id) ON DELETE SET NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retention_runs_date ON retention_runs(run_at DESC);

CREATE TABLE IF NOT EXISTS operational_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 5),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_contacts_active ON operational_contacts(active, escalation_level);

CREATE TABLE IF NOT EXISTS go_live_checklist (
  item_key TEXT PRIMARY KEY,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('security','infrastructure','operations','privacy','accessibility','data','business')),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  evidence TEXT,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('staging','production')),
  decision TEXT NOT NULL CHECK (decision IN ('approved','conditional','rejected')),
  approver_name TEXT NOT NULL,
  approver_email TEXT,
  notes TEXT NOT NULL DEFAULT '',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_release_approvals_release ON release_approvals(release_version, environment, decided_at DESC);

CREATE TABLE IF NOT EXISTS go_live_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  environment TEXT NOT NULL,
  readiness_score INTEGER NOT NULL CHECK (readiness_score BETWEEN 0 AND 100),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('ready','ready_with_conditions','not_ready')),
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_go_live_snapshots_date ON go_live_snapshots(created_at DESC);
