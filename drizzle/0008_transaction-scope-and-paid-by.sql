-- Migration: Separate transaction scope (whose expense) from who paid
-- CRITICAL: Steps must execute in this exact order within a single transaction.
-- Step 1 preserves the original member_id (creator) into paid_by_member_id.
-- Step 2 overwrites member_id with the category's scope.
-- If reversed, we lose who created the transaction.

BEGIN;

-- Step 1: Add paid_by_member_id column (nullable initially for backfill)
ALTER TABLE transactions ADD COLUMN paid_by_member_id TEXT REFERENCES budget_members(id) ON DELETE CASCADE;

-- Step 2: Backfill paid_by_member_id = member_id (preserve who created/paid BEFORE overwriting member_id)
UPDATE transactions SET paid_by_member_id = member_id WHERE member_id IS NOT NULL;

-- Step 3: For transactions without member_id, set paid_by_member_id to a budget member
-- (find any member of the same budget as fallback)
UPDATE transactions t
SET paid_by_member_id = (
  SELECT bm.id FROM budget_members bm
  WHERE bm.budget_id = t.budget_id
  AND bm.type = 'owner'
  LIMIT 1
)
WHERE t.paid_by_member_id IS NULL;

-- Step 4: Now make paid_by_member_id NOT NULL
ALTER TABLE transactions ALTER COLUMN paid_by_member_id SET NOT NULL;

-- Step 5: Overwrite member_id with category scope for expense transactions
-- After this, member_id means "scope" (NULL = shared, set = personal to that member)
UPDATE transactions t
SET member_id = c.member_id
FROM categories c
WHERE t.category_id = c.id
  AND t.type = 'expense';

-- Step 6: Add index for paid_by_member_id
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by_member_id);

-- Step 7: Fix partner income sources created during onboarding with owner's memberId
-- These should be shared (memberId = NULL) since the partner hasn't joined yet
UPDATE income_sources
SET member_id = NULL
WHERE name ILIKE '%parceiro%'
  AND member_id IS NOT NULL;

-- Step 8: Add partial unique indexes for category name uniqueness per scope
CREATE UNIQUE INDEX idx_categories_unique_name_shared
  ON categories (budget_id, name)
  WHERE member_id IS NULL AND is_archived = false;

CREATE UNIQUE INDEX idx_categories_unique_name_personal
  ON categories (budget_id, member_id, name)
  WHERE member_id IS NOT NULL AND is_archived = false;

COMMIT;
