-- Prevent duplicate partner memberships caused by concurrent /invites/accept
-- requests racing with the same token. Partial index ignores dependent rows
-- (children/pets) where user_id is null.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_budget_members_budget_user"
  ON "budget_members" ("budget_id", "user_id")
  WHERE "user_id" IS NOT NULL;
