-- Migration: Standardize monetary fields from integer to bigint
-- This ensures all amount/price fields can handle values beyond R$ 21M (2.1B cents)
-- PostgreSQL ALTER COLUMN to bigint is safe for existing integer data (no data loss)

-- transactions
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE bigint;

-- goal_contributions
ALTER TABLE "goal_contributions" ALTER COLUMN "amount" SET DATA TYPE bigint;

-- income_sources
ALTER TABLE "income_sources" ALTER COLUMN "amount" SET DATA TYPE bigint;
ALTER TABLE "income_sources" ALTER COLUMN "contribution_amount" SET DATA TYPE bigint;

-- monthly_allocations
ALTER TABLE "monthly_allocations" ALTER COLUMN "allocated" SET DATA TYPE bigint;
ALTER TABLE "monthly_allocations" ALTER COLUMN "carried_over" SET DATA TYPE bigint;

-- monthly_income_allocations
ALTER TABLE "monthly_income_allocations" ALTER COLUMN "planned" SET DATA TYPE bigint;
ALTER TABLE "monthly_income_allocations" ALTER COLUMN "contribution_planned" SET DATA TYPE bigint;

-- recurring_bills
ALTER TABLE "recurring_bills" ALTER COLUMN "amount" SET DATA TYPE bigint;

-- categories
ALTER TABLE "categories" ALTER COLUMN "planned_amount" SET DATA TYPE bigint;
ALTER TABLE "categories" ALTER COLUMN "target_amount" SET DATA TYPE bigint;

-- budget_members
ALTER TABLE "budget_members" ALTER COLUMN "monthly_pleasure_budget" SET DATA TYPE bigint;

-- telegram_ai_logs
ALTER TABLE "telegram_ai_logs" ALTER COLUMN "corrected_amount" SET DATA TYPE bigint;

-- plans (prices)
ALTER TABLE "plans" ALTER COLUMN "monthlyPrice" SET DATA TYPE bigint;
ALTER TABLE "plans" ALTER COLUMN "monthlyPriceAnchor" SET DATA TYPE bigint;
ALTER TABLE "plans" ALTER COLUMN "yearlyPrice" SET DATA TYPE bigint;
ALTER TABLE "plans" ALTER COLUMN "yearlyPriceAnchor" SET DATA TYPE bigint;
ALTER TABLE "plans" ALTER COLUMN "onetimePrice" SET DATA TYPE bigint;
ALTER TABLE "plans" ALTER COLUMN "onetimePriceAnchor" SET DATA TYPE bigint;
