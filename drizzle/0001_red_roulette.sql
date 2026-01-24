CREATE TABLE "access_links" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'lifetime' NOT NULL,
	"plan_type" text,
	"user_id" text,
	"used_at" timestamp,
	"created_by" text,
	"note" text,
	"expired" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	CONSTRAINT "access_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"from_account_id" text,
	"transaction_id" text,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"account_id" text,
	"name" text NOT NULL,
	"icon" text DEFAULT '🎯',
	"color" text DEFAULT '#8b5cf6',
	"target_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0,
	"target_date" timestamp NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_income_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"income_source_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"planned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_income_allocation" UNIQUE("budget_id","income_source_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "monthly_budget_status" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"started_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_monthly_status" UNIQUE("budget_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "telegram_users" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" bigint NOT NULL,
	"telegram_user_id" bigint,
	"username" text,
	"first_name" text,
	"user_id" text,
	"current_step" text DEFAULT 'IDLE' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "telegram_users_chat_id_unique" UNIQUE("chat_id"),
	CONSTRAINT "telegram_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_ai_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"budget_id" text,
	"original_message" text NOT NULL,
	"ai_response" jsonb NOT NULL,
	"user_context" jsonb,
	"resolution" text DEFAULT 'pending' NOT NULL,
	"corrected_intent" text,
	"corrected_category_id" text,
	"corrected_amount" integer,
	"is_low_confidence" boolean DEFAULT false NOT NULL,
	"is_unknown_intent" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "telegram_pending_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "telegram_pending_connections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "recurring_bills" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_id" text NOT NULL,
	"category_id" text NOT NULL,
	"account_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"due_day" integer,
	"due_month" integer,
	"is_auto_debit" boolean DEFAULT false,
	"is_variable" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "cleared_balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "credit_limit" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "monthly_deposit" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "income_sources" ADD COLUMN "is_auto_confirm" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "access_link_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_recurring" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_type" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_day" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_parent_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_bill_id" text;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "access_links" ADD CONSTRAINT "access_links_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_links" ADD CONSTRAINT "access_links_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_from_account_id_financial_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_income_allocations" ADD CONSTRAINT "monthly_income_allocations_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_income_allocations" ADD CONSTRAINT "monthly_income_allocations_income_source_id_income_sources_id_fk" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budget_status" ADD CONSTRAINT "monthly_budget_status_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_users" ADD CONSTRAINT "telegram_users_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_ai_logs" ADD CONSTRAINT "telegram_ai_logs_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_ai_logs" ADD CONSTRAINT "telegram_ai_logs_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_pending_connections" ADD CONSTRAINT "telegram_pending_connections_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_access_links_code" ON "access_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_access_links_user_id" ON "access_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_income_allocations_budget_id" ON "monthly_income_allocations" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_income_allocations_income_source_id" ON "monthly_income_allocations" USING btree ("income_source_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_income_allocations_year_month" ON "monthly_income_allocations" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_monthly_budget_status_budget_id" ON "monthly_budget_status" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_budget_status_year_month" ON "monthly_budget_status" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_telegram_users_user_id" ON "telegram_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_users_chat_id" ON "telegram_users" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_user_id" ON "telegram_ai_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_budget_id" ON "telegram_ai_logs" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_is_low_confidence" ON "telegram_ai_logs" USING btree ("is_low_confidence");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_is_unknown_intent" ON "telegram_ai_logs" USING btree ("is_unknown_intent");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_resolution" ON "telegram_ai_logs" USING btree ("resolution");--> statement-breakpoint
CREATE INDEX "idx_telegram_ai_logs_created_at" ON "telegram_ai_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_telegram_pending_code" ON "telegram_pending_connections" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_telegram_pending_user" ON "telegram_pending_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_bills_budget_id" ON "recurring_bills" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_bills_category_id" ON "recurring_bills" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_bill_id_recurring_bills_id_fk" FOREIGN KEY ("recurring_bill_id") REFERENCES "public"."recurring_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_financial_accounts_budget_id" ON "financial_accounts" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_budget_members_user_id" ON "budget_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_budget_members_budget_id" ON "budget_members" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_categories_budget_id" ON "categories" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_categories_group_id" ON "categories" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_users_stripe_customer_id" ON "app_user" USING btree ("stripeCustomerId");--> statement-breakpoint
CREATE INDEX "idx_users_stripe_subscription_id" ON "app_user" USING btree ("stripeSubscriptionId");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "app_user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_transactions_budget_id" ON "transactions" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_account_id" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category_id" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_transactions_income_source_id" ON "transactions" USING btree ("income_source_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_budget_date" ON "transactions" USING btree ("budget_id","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_budget_type_date" ON "transactions" USING btree ("budget_id","type","date");--> statement-breakpoint
CREATE INDEX "idx_transactions_budget_status" ON "transactions" USING btree ("budget_id","status");--> statement-breakpoint
CREATE INDEX "idx_monthly_allocations_budget_id" ON "monthly_allocations" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_allocations_category_id" ON "monthly_allocations" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_allocations_year_month" ON "monthly_allocations" USING btree ("year","month");