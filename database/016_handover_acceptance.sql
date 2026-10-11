CREATE TABLE IF NOT EXISTS handover_checklist (
  item_key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('technical','data','security','operations','business')),
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  evidence TEXT,
  owner TEXT,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handover_checklist_category ON handover_checklist(category, required, completed);

CREATE TABLE IF NOT EXISTS handover_documents (
  document_key TEXT PRIMARY KEY,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved')),
  owner TEXT,
  notes TEXT NOT NULL DEFAULT '',
  last_reviewed_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handover_documents_status ON handover_documents(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS acceptance_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'local',
  status TEXT NOT NULL CHECK (status IN ('passed','conditional','failed')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_runs_created ON acceptance_runs(created_at DESC);
