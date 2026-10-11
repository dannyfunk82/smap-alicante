CREATE TABLE IF NOT EXISTS gtfs_datasets (
  source_id UUID PRIMARY KEY REFERENCES integration_sources(id) ON DELETE CASCADE,
  dataset_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  source_url TEXT,
  license_url TEXT,
  attribution_text TEXT NOT NULL DEFAULT 'Powered by MITRAMS',
  feed_sha1 TEXT,
  valid_from DATE,
  valid_to DATE,
  route_count INTEGER NOT NULL DEFAULT 0,
  stop_count INTEGER NOT NULL DEFAULT 0,
  trip_count INTEGER NOT NULL DEFAULT 0,
  stop_time_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS gtfs_routes (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  internal_line_id TEXT REFERENCES lines(id) ON DELETE SET NULL,
  agency_id TEXT,
  short_name TEXT,
  long_name TEXT,
  route_type INTEGER,
  route_color TEXT,
  route_text_color TEXT,
  PRIMARY KEY(source_id, route_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stops (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  stop_id TEXT NOT NULL,
  internal_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  stop_code TEXT,
  stop_name TEXT NOT NULL,
  stop_lat DOUBLE PRECISION NOT NULL,
  stop_lon DOUBLE PRECISION NOT NULL,
  wheelchair_boarding INTEGER,
  parent_station TEXT,
  PRIMARY KEY(source_id, stop_id)
);

CREATE TABLE IF NOT EXISTS gtfs_calendar (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  monday BOOLEAN NOT NULL DEFAULT FALSE,
  tuesday BOOLEAN NOT NULL DEFAULT FALSE,
  wednesday BOOLEAN NOT NULL DEFAULT FALSE,
  thursday BOOLEAN NOT NULL DEFAULT FALSE,
  friday BOOLEAN NOT NULL DEFAULT FALSE,
  saturday BOOLEAN NOT NULL DEFAULT FALSE,
  sunday BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  PRIMARY KEY(source_id, service_id)
);

CREATE TABLE IF NOT EXISTS gtfs_calendar_dates (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_date DATE NOT NULL,
  exception_type INTEGER NOT NULL CHECK (exception_type IN (1,2)),
  PRIMARY KEY(source_id, service_id, service_date)
);

CREATE TABLE IF NOT EXISTS gtfs_trips (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  internal_line_id TEXT REFERENCES lines(id) ON DELETE SET NULL,
  service_id TEXT NOT NULL,
  trip_headsign TEXT,
  direction_id INTEGER,
  shape_id TEXT,
  PRIMARY KEY(source_id, trip_id)
);

CREATE TABLE IF NOT EXISTS gtfs_stop_times (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  internal_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
  arrival_seconds INTEGER NOT NULL,
  departure_seconds INTEGER NOT NULL,
  stop_sequence INTEGER NOT NULL,
  PRIMARY KEY(source_id, trip_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS gtfs_shapes (
  source_id UUID NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL,
  point_sequence INTEGER NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance_traveled DOUBLE PRECISION,
  PRIMARY KEY(source_id, shape_id, point_sequence)
);

CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop_departure
  ON gtfs_stop_times(source_id, internal_stop_id, departure_seconds);
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_service_route
  ON gtfs_trips(source_id, service_id, route_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_calendar_dates_date
  ON gtfs_calendar_dates(source_id, service_date, exception_type);
CREATE INDEX IF NOT EXISTS idx_gtfs_shapes_shape_sequence
  ON gtfs_shapes(source_id, shape_id, point_sequence);
