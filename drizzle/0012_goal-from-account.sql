ALTER TABLE "goals" ADD COLUMN "from_account_id" text REFERENCES "financial_accounts"("id") ON DELETE SET NULL;
