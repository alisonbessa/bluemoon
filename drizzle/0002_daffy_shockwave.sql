CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"display_name" text,
	"user_id" text,
	"current_step" text DEFAULT 'IDLE' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_users_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "whatsapp_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_pending_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "whatsapp_pending_connections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "deletion_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "deletion_reason" text;--> statement-breakpoint
ALTER TABLE "telegram_ai_logs" ADD COLUMN "bot_response" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_users" ADD CONSTRAINT "whatsapp_users_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_pending_connections" ADD CONSTRAINT "whatsapp_pending_connections_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_whatsapp_users_user_id" ON "whatsapp_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_users_phone" ON "whatsapp_users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_pending_code" ON "whatsapp_pending_connections" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_pending_user" ON "whatsapp_pending_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "app_user" USING btree ("deleted_at");