import { NextResponse } from "next/server";
import { z } from "zod";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import {
  emailCampaignConfigs,
  type CampaignKey,
} from "@/db/schema/email-campaigns";
import { CAMPAIGNS_REGISTRY, CAMPAIGN_KEYS } from "@/shared/lib/email/campaigns-registry";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  subjectOverride: z.string().trim().max(200).nullable().optional(),
});

export const PATCH = withSuperAdminAuthRequired(async (req, { params }) => {
  const awaited = await params;
  const key = awaited.key as CampaignKey;

  if (!CAMPAIGN_KEYS.includes(key)) {
    return NextResponse.json({ error: "unknown_campaign" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.message },
      { status: 400 }
    );
  }

  const meta = CAMPAIGNS_REGISTRY[key];
  const patch = parsed.data;

  // Upsert so a row missing from seed still gets created on first edit
  const [updated] = await db
    .insert(emailCampaignConfigs)
    .values({
      campaignKey: key,
      name: meta.name,
      description: meta.description,
      enabled: patch.enabled ?? true,
      subjectOverride:
        patch.subjectOverride === undefined
          ? null
          : patch.subjectOverride?.length
          ? patch.subjectOverride
          : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: emailCampaignConfigs.campaignKey,
      set: {
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.subjectOverride !== undefined
          ? {
              subjectOverride: patch.subjectOverride?.length
                ? patch.subjectOverride
                : null,
            }
          : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({
    campaign: {
      key,
      name: updated.name,
      description: updated.description,
      enabled: updated.enabled,
      defaultSubject: meta.defaultSubject,
      subjectOverride: updated.subjectOverride,
      effectiveSubject:
        updated.subjectOverride?.trim() || meta.defaultSubject,
      updatedAt: updated.updatedAt,
    },
  });
});
