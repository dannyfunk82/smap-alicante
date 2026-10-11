ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_notice_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pilot_participant BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

UPDATE users
   SET privacy_notice_version=COALESCE(privacy_notice_version,'2026-07'),
       privacy_accepted_at=COALESCE(privacy_accepted_at,created_at)
 WHERE privacy_accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS privacy_documents (
  id BIGSERIAL PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('privacy','terms')),
  version TEXT NOT NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(document_type, version)
);

CREATE TABLE IF NOT EXISTS user_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy','terms','analytics','pilot')),
  document_version TEXT,
  granted BOOLEAN NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_time ON user_consents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  section TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_day DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_day ON analytics_events(user_id, session_day);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('general','route','stop','bus','accessibility','ticket')),
  entity_type TEXT CHECK (entity_type IN ('line','stop','bus','ticket')),
  entity_id TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','planned','resolved','closed')),
  admin_response TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_time ON feedback_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status_time ON feedback_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_category ON feedback_reports(category);

INSERT INTO privacy_documents(document_type,version,title_es,title_en,content_es,content_en,active)
VALUES
('privacy','2026-07','Aviso de privacidad SMAP','SMAP privacy notice',
 'SMAP utiliza los datos de cuenta para prestar el servicio demo. La analítica opcional se basa en eventos de uso sin almacenar el contenido de los viajes como perfil comercial. Puedes retirar el consentimiento, exportar tus datos o solicitar la eliminación de la cuenta.',
 'SMAP uses account data to provide the demo service. Optional analytics is based on usage events and does not use journey content for commercial profiling. You can withdraw consent, export your data or request account deletion.',TRUE),
('terms','2026-07','Condiciones de la demo SMAP','SMAP demo terms',
 'Esta versión es una demostración. Los tiempos, posiciones, precios, pagos y billetes no representan un servicio de transporte o cobro real.',
 'This version is a demonstration. Times, positions, prices, payments and tickets do not represent a real transport or payment service.',TRUE)
ON CONFLICT(document_type,version) DO UPDATE SET active=TRUE;

INSERT INTO user_consents(user_id,consent_type,document_version,granted,source)
SELECT u.id,'privacy','2026-07',TRUE,'migration'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_consents c WHERE c.user_id=u.id AND c.consent_type='privacy' AND c.document_version='2026-07');

INSERT INTO user_consents(user_id,consent_type,document_version,granted,source)
SELECT u.id,'terms','2026-07',TRUE,'migration'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_consents c WHERE c.user_id=u.id AND c.consent_type='terms' AND c.document_version='2026-07');
