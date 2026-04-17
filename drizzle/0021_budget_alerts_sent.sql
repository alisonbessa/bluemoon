-- Tracks which budget-threshold alerts have already been dispatched so that
-- the daily budget-threshold job is idempotent and does not spam users.
CREATE TABLE IF NOT EXISTS "budget_alerts_sent" (
  "id" text PRIMARY KEY NOT NULL,
  "budget_id" text NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
  "category_id" text NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "threshold_pct" integer NOT NULL,
  "spent_cents" bigint NOT NULL,
  "planned_cents" bigint NOT NULL,
  "sent_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_budget_alerts_sent_bucket"
  ON "budget_alerts_sent" ("budget_id", "category_id", "year", "month", "threshold_pct");

CREATE INDEX IF NOT EXISTS "idx_budget_alerts_sent_budget"
  ON "budget_alerts_sent" ("budget_id");
