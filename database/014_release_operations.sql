CREATE TABLE IF NOT EXISTS release_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  deployment_id TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL CHECK (environment IN ('local','staging','production')),
  strategy TEXT NOT NULL DEFAULT 'canary' CHECK (strategy IN ('all_at_once','canary','blue_green')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','approved','in_progress','completed','failed','rolled_back','cancelled')),
  rollout_percent INTEGER NOT NULL DEFAULT 10 CHECK (rollout_percent BETWEEN 0 AND 100),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  owner TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_release_plans_created ON release_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_release_plans_status ON release_plans(environment,status,created_at DESC);

CREATE TABLE IF NOT EXISTS release_steps (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES release_plans(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','skipped')),
  evidence TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id,step_key)
);
CREATE INDEX IF NOT EXISTS idx_release_steps_plan ON release_steps(plan_id,sequence);

CREATE TABLE IF NOT EXISTS release_health_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES release_plans(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL DEFAULT 'validation' CHECK (observation_type IN ('metric','incident','validation','note')),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warning','error')),
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_release_observations_plan ON release_health_observations(plan_id,observed_at DESC);

CREATE TABLE IF NOT EXISTS release_rollback_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES release_plans(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  backup_reference TEXT,
  deployment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','used','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_release_rollback_points_plan ON release_rollback_points(plan_id,created_at DESC);

CREATE TABLE IF NOT EXISTS release_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES release_plans(id) ON DELETE CASCADE,
  rollback_point_id UUID REFERENCES release_rollback_points(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','executed','failed','cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_release_rollbacks_plan ON release_rollbacks(plan_id,requested_at DESC);
