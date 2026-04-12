import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { betaSurveys } from "@/db/schema/email-campaigns";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:survey");

const schema = z.object({
  surveyKey: z.string().min(1).max(64),
  nps: z.number().int().min(0).max(10),
  likes: z.string().max(4000).nullable().optional(),
  missing: z.string().max(4000).nullable().optional(),
  acceptsFollowUpEmails: z.boolean().optional(),
});

export const POST = withAuthRequired(async (req, { session }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.message },
      { status: 400 }
    );
  }

  const { surveyKey, nps, likes, missing, acceptsFollowUpEmails } = parsed.data;

  try {
    await db
      .insert(betaSurveys)
      .values({
        userId: session.user.id,
        surveyKey,
        nps,
        likes: likes ?? null,
        missing: missing ?? null,
        acceptsFollowUpEmails: acceptsFollowUpEmails ?? false,
      })
      .onConflictDoNothing({
        target: [betaSurveys.userId, betaSurveys.surveyKey],
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to save survey response", error, {
      userId: session.user.id,
      surveyKey,
    });
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
});
