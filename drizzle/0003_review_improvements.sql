-- Change goals amounts from integer to bigint for long-term goals (fix 1.5)
ALTER TABLE "goals" ALTER COLUMN "target_amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "current_amount" SET DATA TYPE bigint;--> statement-breakpoint

-- Add date bounds to recurring_bills (fix 4.3)
ALTER TABLE "recurring_bills" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD COLUMN "end_date" timestamp;--> statement-breakpoint

-- Add composite index for billing cycle queries (fix 3.5)
CREATE INDEX "idx_transactions_account_type_status_date" ON "transactions" USING btree ("account_id","type","status","date");
