CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp NOT NULL,
	"read_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "target_amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "current_amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "budget_members" ADD COLUMN "privacy_level" text DEFAULT 'all_visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_feedback_user_id" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_feedback_created_at" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_account_type_status_date" ON "transactions" USING btree ("account_id","type","status","date");