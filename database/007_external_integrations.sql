CREATE TABLE IF NOT EXISTS integration_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (provider_type IN ('demo', 'gtfs', 'avanza', 'custom')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  base_url TEXT,
  status TEXT NOT NULL DEFAULT 'configured'
    CHECK (status IN ('configured', 'healthy', 'degraded', 'error', 'disabled')),
  last_static_sync_at TIMESTAMPTZ,
  last_realtime_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'demo'
    CHECK (mode IN ('demo', 'hybrid', 'external')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_age_seconds INTEGER NOT NULL DEFAULT 45
    CHECK (max_age_seconds BETWEEN 10 AND 600),
  active_source_id UUID REFERENCES integration_sources(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO integration_settings(id, mode, fallback_enabled, max_age_seconds)
VALUES (1, 'demo', TRUE, 45)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE lines
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES integration_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE stops
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES integration_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES integration_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lines_source_external
  ON lines(source_id, external_id) WHERE source_id IS NOT NULL AND external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stops_source_external
  ON stops(source_id, external_id) WHERE source_id IS NOT NULL AND external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_buses_source_external
  ON buses(source_id, external_id) WHERE source_id IS NOT NULL AND external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS external_bus_positions (
  id BIGSERIAL PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),
  next_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  eta_seconds INTEGER,
  passenger_count INTEGER,
  capacity INTEGER,
  occupancy_percentage INTEGER CHECK (occupancy_percentage BETWEEN 0 AND 100),
  operational_status TEXT NOT NULL DEFAULT 'in_service'
    CHECK (operational_status IN ('in_service', 'stopped', 'out_of_service', 'gps_lost')),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_id, bus_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_external_positions_bus_time
  ON external_bus_positions(bus_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_positions_source_time
  ON external_bus_positions(source_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source_id UUID REFERENCES integration_sources(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('static', 'realtime', 'test')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  records_received INTEGER NOT NULL DEFAULT 0,
  records_applied INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_source_time
  ON integration_sync_runs(source_id, started_at DESC);
