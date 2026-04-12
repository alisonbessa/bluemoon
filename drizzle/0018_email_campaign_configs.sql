-- Per-campaign config so super-admins can toggle and rename subjects
-- without a redeploy. The cron skips rows where enabled = false.

CREATE TABLE IF NOT EXISTS "email_campaign_configs" (
  "campaign_key" text PRIMARY KEY,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "subject_override" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Seed the 7 existing campaigns. Safe to re-run thanks to ON CONFLICT.
INSERT INTO "email_campaign_configs"
  ("campaign_key", "name", "description", "enabled")
VALUES
  ('onboarding_d1', 'Onboarding D+1',
   'Enviado 1 dia após o signup, se o usuário ainda não completou o onboarding.', true),
  ('onboarding_stuck_d7', 'Onboarding travado D+7',
   'Enviado 7 dias após o signup, se o usuário ainda não completou o onboarding. Pede feedback sobre o que travou.', true),
  ('no_transaction_d3', 'Sem primeira transação D+3',
   'Enviado 3 dias após completar o onboarding, se o usuário ainda não registrou nenhuma transação.', true),
  ('no_whatsapp_d7', 'Sem WhatsApp D+7',
   'Enviado 7 dias após completar o onboarding, se o usuário não conectou o WhatsApp.', true),
  ('no_ai_d10', 'Sem uso da IA D+10',
   'Enviado 10 dias após o onboarding, se o usuário não usou o assistente de IA nos últimos 30 dias.', true),
  ('power_user_feedback', 'Feedback de power user',
   'Enviado uma única vez para usuários com 5+ transações nos últimos 30 dias. Leva ao formulário de survey.', true),
  ('winback_d21', 'Win-back D+21',
   'Enviado para usuários sem nenhuma atividade (transação, IA) há 21+ dias. Pede feedback sobre o que faltou.', true)
ON CONFLICT ("campaign_key") DO NOTHING;
