ALTER TABLE users
  ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS text_scale TEXT NOT NULL DEFAULT 'normal'
    CHECK (text_scale IN ('normal', 'large', 'xlarge')),
  ADD COLUMN IF NOT EXISTS arrival_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ticket_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS service_notifications BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_tickets_user_status
  ON tickets(user_id, status, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON notifications(user_id, type, created_at DESC);
