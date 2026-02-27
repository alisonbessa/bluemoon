ALTER TABLE "income_sources" ADD COLUMN "contribution_amount" integer;
--> statement-breakpoint
ALTER TABLE "monthly_income_allocations" ADD COLUMN "contribution_planned" integer;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "privacy_mode" text DEFAULT 'visible';
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "pending_privacy_mode" text;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "privacy_change_requested_by" text;
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_privacy_change_requested_by_budget_members_id_fk" FOREIGN KEY ("privacy_change_requested_by") REFERENCES "public"."budget_members"("id") ON DELETE set null ON UPDATE no action;
