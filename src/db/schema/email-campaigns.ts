import { timestamp, pgTable, text, index, uniqueIndex, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

/**
 * Retention/marketing campaign keys.
 * Keep this list in sync with the cron in
 * src/shared/lib/inngest/functions/run-retention-campaigns.ts
 */
export type CampaignKey =
  | "onboarding_d1"
  | "onboarding_stuck_d7"
  | "no_transaction_d3"
  | "no_whatsapp_d7"
  | "no_ai_d10"
  | "power_user_feedback"
  | "winback_d21";

/**
 * Tracks every retention email we send to a user.
 * The unique(userId, campaignKey) constraint guarantees each campaign is
 * delivered at most once per user, and lets us enforce throttling between
 * campaigns.
 */
export const emailCampaignSends = pgTable(
  "email_campaign_sends",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignKey: text("campaign_key").$type<CampaignKey>().notNull(),
    status: text("status").$type<"sent" | "failed">().notNull().default("sent"),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_campaign_sends_user_campaign").on(table.userId, table.campaignKey),
    index("idx_campaign_sends_user_sent_at").on(table.userId, table.sentAt),
    index("idx_campaign_sends_campaign_key").on(table.campaignKey),
  ]
);

export const emailCampaignSendsRelations = relations(emailCampaignSends, ({ one }) => ({
  user: one(users, {
    fields: [emailCampaignSends.userId],
    references: [users.id],
  }),
}));

export type EmailCampaignSend = typeof emailCampaignSends.$inferSelect;
export type NewEmailCampaignSend = typeof emailCampaignSends.$inferInsert;

/**
 * Structured survey answers (e.g. beta power-user feedback).
 * Keeping this separate from the free-text `feedback` table because the
 * schema is structured (NPS, likes, missing, call-opt-in).
 */
export const betaSurveys = pgTable(
  "beta_surveys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surveyKey: text("survey_key").notNull(),
    // 0-10 Net Promoter Score
    nps: integer("nps"),
    // "What do you like the most?"
    likes: text("likes"),
    // "What's missing / what frustrates you?"
    missing: text("missing"),
    // Would the user accept occasional follow-up questions by email?
    acceptsFollowUpEmails: boolean("accepts_follow_up_emails").default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_beta_surveys_user_id").on(table.userId),
    index("idx_beta_surveys_survey_key").on(table.surveyKey),
    uniqueIndex("uq_beta_surveys_user_survey").on(table.userId, table.surveyKey),
  ]
);

export const betaSurveysRelations = relations(betaSurveys, ({ one }) => ({
  user: one(users, {
    fields: [betaSurveys.userId],
    references: [users.id],
  }),
}));

export type BetaSurvey = typeof betaSurveys.$inferSelect;
export type NewBetaSurvey = typeof betaSurveys.$inferInsert;
