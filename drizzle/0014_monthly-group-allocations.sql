CREATE TABLE IF NOT EXISTS "monthly_group_allocations" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "budget_id" text NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
  "group_id" text NOT NULL REFERENCES "groups"("id"),
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "allocated" bigint NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "unique_group_allocation" UNIQUE("budget_id", "group_id", "year", "month")
);

CREATE INDEX IF NOT EXISTS "idx_monthly_group_allocations_budget" ON "monthly_group_allocations" ("budget_id", "year", "month");
