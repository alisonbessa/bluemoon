-- Track the last inbound WhatsApp message timestamp per user so we can
-- check if the 24h Customer Service Window is still open before sending
-- free-form messages (outside it, only billable templates work).
ALTER TABLE "whatsapp_users"
  ADD COLUMN IF NOT EXISTS "last_inbound_at" timestamp;
