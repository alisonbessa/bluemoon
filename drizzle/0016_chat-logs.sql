CREATE TABLE IF NOT EXISTS "chat_logs" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "session_id" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_chat_logs_user_id" ON "chat_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_logs_session_id" ON "chat_logs" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_chat_logs_created_at" ON "chat_logs" ("created_at");
