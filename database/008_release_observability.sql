CREATE TABLE IF NOT EXISTS runtime_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_title_es TEXT NOT NULL DEFAULT 'Mantenimiento programado',
  maintenance_title_en TEXT NOT NULL DEFAULT 'Scheduled maintenance',
  maintenance_message_es TEXT NOT NULL DEFAULT 'El servicio puede presentar interrupciones temporales.',
  maintenance_message_en TEXT NOT NULL DEFAULT 'The service may experience temporary interruptions.',
  support_email TEXT,
  public_status_message_es TEXT,
  public_status_message_en TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO runtime_settings(id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS deployment_releases (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'local'
    CHECK (environment IN ('local', 'staging', 'production')),
  status TEXT NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'deployed', 'rolled_back', 'failed')),
  commit_ref TEXT,
  notes TEXT,
  deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deployment_releases_created
  ON deployment_releases(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deployment_releases_deployment_id
  ON deployment_releases(deployment_id);

CREATE TABLE IF NOT EXISTS system_checks (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  latency_ms INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_checks_time
  ON system_checks(checked_at DESC);

CREATE TABLE IF NOT EXISTS service_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'monitoring', 'resolved')),
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_es TEXT NOT NULL,
  body_en TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_incidents_status_time
  ON service_incidents(status, starts_at DESC);
