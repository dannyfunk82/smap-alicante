CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  preferred_language VARCHAR(2) NOT NULL DEFAULT 'es' CHECK (preferred_language IN ('es', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lines (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accessible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS line_stops (
  line_id TEXT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  PRIMARY KEY (line_id, stop_id),
  UNIQUE (line_id, sequence)
);

CREATE TABLE IF NOT EXISTS buses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  line_id TEXT NOT NULL REFERENCES lines(id),
  capacity INTEGER NOT NULL DEFAULT 70,
  status TEXT NOT NULL DEFAULT 'demo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_name_es ON stops (LOWER(name_es));
CREATE INDEX IF NOT EXISTS idx_stops_name_en ON stops (LOWER(name_en));
CREATE INDEX IF NOT EXISTS idx_line_stops_line_sequence ON line_stops (line_id, sequence);
