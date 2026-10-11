ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'approved' CHECK (payment_status IN ('approved','declined'));

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);
