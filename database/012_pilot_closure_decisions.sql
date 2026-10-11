CREATE TABLE IF NOT EXISTS pilot_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES pilot_cohorts(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_kpi_snapshots_created ON pilot_kpi_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS pilot_improvement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES pilot_cohorts(id) ON DELETE SET NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_es TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('ux','accessibility','data','ticketing','operations','security','integration')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  impact TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low','medium','high')),
  effort TEXT NOT NULL DEFAULT 'medium' CHECK (effort IN ('small','medium','large')),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','in_progress','completed','rejected')),
  owner TEXT,
  target_date DATE,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('feedback','survey','support','analytics','manual')),
  source_reference TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_improvement_actions_status ON pilot_improvement_actions(status, priority, updated_at DESC);

CREATE TABLE IF NOT EXISTS pilot_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES pilot_improvement_actions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject','defer','needs_data')),
  rationale TEXT NOT NULL,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_decisions_date ON pilot_decisions(decided_at DESC);

CREATE TABLE IF NOT EXISTS pilot_final_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES pilot_cohorts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  executive_summary_es TEXT NOT NULL,
  executive_summary_en TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('go','go_with_conditions','extend_pilot','stop')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_final_reports_status ON pilot_final_reports(status, created_at DESC);
