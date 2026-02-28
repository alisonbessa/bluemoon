-- Replace "totals_only" privacy mode with "unified"
-- "unified" = everything visible (accounts, goals, categories with real amounts),
-- only individual partner transaction details are hidden

-- Update budgets table
UPDATE budgets SET privacy_mode = 'unified' WHERE privacy_mode = 'totals_only';
UPDATE budgets SET pending_privacy_mode = 'unified' WHERE pending_privacy_mode = 'totals_only';

-- Update budget_members table
UPDATE budget_members SET privacy_level = 'unified' WHERE privacy_level = 'totals_only';
