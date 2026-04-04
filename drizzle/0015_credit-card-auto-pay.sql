ALTER TABLE "financial_accounts" ADD COLUMN IF NOT EXISTS "is_auto_pay_enabled" boolean DEFAULT false;
