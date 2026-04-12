-- Retention email campaigns: per-user send tracking, survey responses,
-- and global opt-out flag on app_user.

-- 1. Track every retention email we send, per user + campaign.
CREATE TABLE IF NOT EXISTS "email_campaign_sends" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "campaign_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'sent',
  "error_message" text,
  "sent_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_campaign_sends_user_campaign"
  ON "email_campaign_sends" ("user_id", "campaign_key");
CREATE INDEX IF NOT EXISTS "idx_campaign_sends_user_sent_at"
  ON "email_campaign_sends" ("user_id", "sent_at");
CREATE INDEX IF NOT EXISTS "idx_campaign_sends_campaign_key"
  ON "email_campaign_sends" ("campaign_key");

-- 2. Structured survey answers (NPS + open-ended).
CREATE TABLE IF NOT EXISTS "beta_surveys" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "survey_key" text NOT NULL,
  "nps" integer,
  "likes" text,
  "missing" text,
  "accepts_follow_up_emails" boolean DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_beta_surveys_user_id"
  ON "beta_surveys" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_beta_surveys_survey_key"
  ON "beta_surveys" ("survey_key");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_beta_surveys_user_survey"
  ON "beta_surveys" ("user_id", "survey_key");

-- 3. Global opt-out flag for retention/marketing emails. Transactional
--    emails (auth, billing, invite acceptance) ignore this flag.
ALTER TABLE "app_user"
  ADD COLUMN IF NOT EXISTS "unsubscribed_from_campaigns_at" timestamp;
