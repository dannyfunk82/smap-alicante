CREATE TABLE IF NOT EXISTS operational_slos (
  metric_key TEXT PRIMARY KEY,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('min','max')),
  target_value NUMERIC(12,3) NOT NULL,
  warning_value NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL DEFAULT '%',
  window_minutes INTEGER NOT NULL DEFAULT 60 CHECK (window_minutes BETWEEN 5 AND 43200),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operational_measurements (
  id BIGSERIAL PRIMARY KEY,
  metric_key TEXT NOT NULL REFERENCES operational_slos(metric_key) ON DELETE CASCADE,
  value NUMERIC(14,3) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_measurements_metric_time ON operational_measurements(metric_key,measured_at DESC);

CREATE TABLE IF NOT EXISTS on_call_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'primary',
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_on_call_shifts_window ON on_call_shifts(starts_at,ends_at,status);

CREATE TABLE IF NOT EXISTS continuity_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('backup_restore','failover','incident_drill','communications')),
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','failed','cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  result_es TEXT NOT NULL DEFAULT '',
  result_en TEXT NOT NULL DEFAULT '',
  evidence TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_continuity_exercises_schedule ON continuity_exercises(status,scheduled_at);

CREATE TABLE IF NOT EXISTS incident_postmortems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES service_incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
  summary_es TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  impact_es TEXT NOT NULL DEFAULT '',
  impact_en TEXT NOT NULL DEFAULT '',
  root_cause_es TEXT NOT NULL DEFAULT '',
  root_cause_en TEXT NOT NULL DEFAULT '',
  corrective_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incident_postmortems_status ON incident_postmortems(status,updated_at DESC);
