-- Tabela de configurações de contribuição por membro para metas conjuntas
CREATE TABLE "goal_member_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "goal_id" text NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "member_id" text NOT NULL REFERENCES "budget_members"("id") ON DELETE CASCADE,
  "from_account_id" text REFERENCES "financial_accounts"("id") ON DELETE SET NULL,
  "monthly_amount" bigint,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "uq_goal_member_settings" UNIQUE("goal_id", "member_id")
);

CREATE INDEX "idx_goal_member_settings_goal_id" ON "goal_member_settings"("goal_id");

-- Adicionar memberId nas contribuições para identificar quem contribuiu
ALTER TABLE "goal_contributions" ADD COLUMN "member_id" text REFERENCES "budget_members"("id") ON DELETE SET NULL;

CREATE INDEX "idx_goal_contributions_member_id" ON "goal_contributions"("member_id");
