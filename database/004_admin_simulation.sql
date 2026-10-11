ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
  CHECK (role IN ('citizen', 'admin'));

UPDATE users SET role = 'admin' WHERE email = 'demo@smap.local';

CREATE TABLE IF NOT EXISTS demo_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  simulation_speed NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (simulation_speed BETWEEN 0.25 AND 4.00),
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_settings(id, simulation_speed, paused)
VALUES (1, 1.00, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS demo_bus_controls (
  bus_id TEXT PRIMARY KEY REFERENCES buses(id) ON DELETE CASCADE,
  operational_status TEXT NOT NULL DEFAULT 'in_service'
    CHECK (operational_status IN ('in_service', 'stopped', 'out_of_service', 'gps_lost')),
  speed_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (speed_multiplier BETWEEN 0.00 AND 4.00),
  occupancy_override INTEGER CHECK (occupancy_override BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_bus_controls(bus_id)
SELECT id FROM buses
ON CONFLICT (bus_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_demo_bus_controls_status
  ON demo_bus_controls(operational_status, updated_at DESC);
