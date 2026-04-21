-- Migration: restructure personal expense categories into per-member groups
-- The "pleasures" global group is replaced by individual personal groups per budget member.

-- Step 1: Add budgetId and memberId columns to groups
ALTER TABLE "groups"
  ADD COLUMN "budget_id" text REFERENCES "budgets"("id") ON DELETE CASCADE,
  ADD COLUMN "member_id" text REFERENCES "budget_members"("id") ON DELETE CASCADE;

-- Step 2: Remove old unique constraint on code (it was a simple unique column)
ALTER TABLE "groups" DROP CONSTRAINT IF EXISTS "groups_code_unique";

-- Step 3: Make code nullable (personal groups have no fixed code)
ALTER TABLE "groups" ALTER COLUMN "code" DROP NOT NULL;

-- Step 4: Add new partial unique index: code must be unique only among global groups
CREATE UNIQUE INDEX "uq_groups_global_code"
  ON "groups" ("code")
  WHERE "budget_id" IS NULL AND "code" IS NOT NULL;

-- Step 5: Each member can only have one personal group per budget
CREATE UNIQUE INDEX "uq_groups_member_budget"
  ON "groups" ("budget_id", "member_id")
  WHERE "member_id" IS NOT NULL;

-- Step 6: Performance indexes
CREATE INDEX "idx_groups_budget_id" ON "groups" ("budget_id");
CREATE INDEX "idx_groups_member_id" ON "groups" ("member_id");

-- Step 7: Data migration — create personal groups for existing budgets
-- For each (budget, member) pair that has a personal category in the "pleasures" group,
-- create a new personal group and redirect those categories to it.

DO $$
DECLARE
  pleasures_group_id text;
  rec RECORD;
  new_group_id text;
  member_first_name text;
BEGIN
  -- Get the global "pleasures" group id
  SELECT id INTO pleasures_group_id FROM groups WHERE code = 'pleasures' AND budget_id IS NULL LIMIT 1;

  IF pleasures_group_id IS NULL THEN
    RAISE NOTICE 'No pleasures group found, skipping data migration.';
    RETURN;
  END IF;

  -- For each unique (budget_id, member_id) that has a personal category in pleasures
  FOR rec IN
    SELECT DISTINCT c.budget_id, c.member_id, bm.name AS member_name
    FROM categories c
    JOIN budget_members bm ON bm.id = c.member_id
    WHERE c.group_id = pleasures_group_id
      AND c.member_id IS NOT NULL
      AND c.is_archived = false
  LOOP
    -- Extract first name (everything before the first space)
    member_first_name := split_part(rec.member_name, ' ', 1);

    -- Check if a personal group already exists for this (budget, member)
    SELECT id INTO new_group_id
    FROM groups
    WHERE budget_id = rec.budget_id AND member_id = rec.member_id
    LIMIT 1;

    IF new_group_id IS NULL THEN
      -- Create the personal group
      new_group_id := gen_random_uuid()::text;
      INSERT INTO groups (id, budget_id, member_id, code, name, description, icon, display_order, created_at)
      VALUES (
        new_group_id,
        rec.budget_id,
        rec.member_id,
        NULL,
        'Gastos de ' || member_first_name,
        'Gastos pessoais de ' || member_first_name,
        '✨',
        10, -- after the 4 global groups (displayOrder 1-4)
        NOW()
      );
      RAISE NOTICE 'Created personal group for member % in budget %', rec.member_id, rec.budget_id;
    END IF;

    -- Move all personal categories from pleasures → new personal group
    UPDATE categories
    SET group_id = new_group_id
    WHERE budget_id = rec.budget_id
      AND member_id = rec.member_id
      AND group_id = pleasures_group_id;

  END LOOP;

  RAISE NOTICE 'Data migration complete.';
END;
$$;

-- Step 8: Remove the "pleasures" global group (now empty after migration)
-- We do a safe delete: only removes if no categories still reference it.
-- If any remain (edge case), the group stays and can be cleaned up manually.
DELETE FROM groups
WHERE code = 'pleasures'
  AND budget_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories WHERE group_id = groups.id
  );
