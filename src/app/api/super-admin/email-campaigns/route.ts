import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import {
  emailCampaignConfigs,
  emailCampaignSends,
  type CampaignKey,
} from "@/db/schema/email-campaigns";
import { max, sql } from "drizzle-orm";
import { CAMPAIGNS_REGISTRY, CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";
import { seedMissingConfigs } from "@/shared/lib/email/retention-runner";
import { isManualDispatchable } from "@/shared/lib/email/manual-dispatch";

export const GET = withSuperAdminAuthRequired(async () => {
  // Auto-seed config rows that the code knows about but the DB is missing.
  // Defensive: if the SQL seed in the migration didn't run (prod deploys
  // only apply DDL, etc.), the admin page still shows all campaigns.
  await seedMissingConfigs();

  const configs = await db.select().from(emailCampaignConfigs);

  const statsRows = await db
    .select({
      campaignKey: emailCampaignSends.campaignKey,
      total: sql<number>`count(*)::int`,
      sent: sql<number>`count(*) filter (where ${emailCampaignSends.status} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${emailCampaignSends.status} = 'failed')::int`,
      lastSentAt: max(emailCampaignSends.sentAt),
    })
    .from(emailCampaignSends)
    .groupBy(emailCampaignSends.campaignKey);

  const statsByKey = new Map(statsRows.map((r) => [r.campaignKey as CampaignKey, r]));
  const configByKey = new Map(configs.map((c) => [c.campaignKey, c]));

  // Always return all campaigns the code knows about, even if their config
  // row hasn't been seeded yet (they'll appear as "enabled" by default so
  // the admin can immediately disable or override them).
  const campaigns = CAMPAIGN_KEYS.map((key) => {
    const meta = CAMPAIGNS_REGISTRY[key];
    const config = configByKey.get(key);
    const stats = statsByKey.get(key);
    return {
      key,
      name: config?.name ?? meta.name,
      description: config?.description ?? meta.description,
      enabled: config?.enabled ?? true,
      defaultSubject: meta.defaultSubject,
      subjectOverride: config?.subjectOverride ?? null,
      effectiveSubject: config?.subjectOverride?.trim() || meta.defaultSubject,
      updatedAt: config?.updatedAt ?? null,
      manualDispatch: isManualDispatchable(key),
      stats: {
        total: stats?.total ?? 0,
        sent: stats?.sent ?? 0,
        failed: stats?.failed ?? 0,
        lastSentAt: stats?.lastSentAt ?? null,
      },
    };
  });

  return NextResponse.json({ campaigns });
});
