CREATE TABLE IF NOT EXISTS pilot_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES pilot_cohorts(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_es TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','closed','cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_campaigns_status ON pilot_campaigns(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_pilot_campaigns_cohort ON pilot_campaigns(cohort_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pilot_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES pilot_campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_es TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_surveys_campaign ON pilot_surveys(campaign_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS pilot_survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES pilot_surveys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  question_type TEXT NOT NULL CHECK (question_type IN ('rating','single','text')),
  prompt_es TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(survey_id, position)
);

CREATE TABLE IF NOT EXISTS pilot_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES pilot_surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(survey_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_pilot_survey_responses_survey ON pilot_survey_responses(survey_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS pilot_survey_answers (
  response_id UUID NOT NULL REFERENCES pilot_survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pilot_survey_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(response_id, question_id)
);

CREATE TABLE IF NOT EXISTS pilot_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID REFERENCES pilot_cohorts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES pilot_campaigns(id) ON DELETE SET NULL,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_es TEXT NOT NULL,
  body_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','cancelled')),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilot_broadcasts_created ON pilot_broadcasts(created_at DESC);
