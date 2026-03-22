import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { waitlist } from "@/db/schema/waitlist";
import { checkRateLimit, rateLimits } from "@/shared/lib/security/rate-limit";
import { render } from "@react-email/components";
import sendMail from "@/shared/lib/email/sendMail";
import WaitlistConfirmation from "@/emails/WaitlistConfirmation";
import { appConfig } from "@/shared/lib/config";

const waitlistSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  instagramAccount: z.string().optional(),
  betaTester: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, rateLimits.contact, "waitlist");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const json = await request.json();
    const body = waitlistSchema.parse(json);

    const entry = await db
      .insert(waitlist)
      .values({
        name: body.name,
        email: body.email,
        instagramAccount: body.instagramAccount || null,
        betaTester: body.betaTester || false,
      })
      .returning();

    // Send confirmation email
    try {
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const html = await render(
        WaitlistConfirmation({
          userName: body.name,
          siteUrl,
        })
      );
      await sendMail(
        body.email,
        `Você está na lista de espera do ${appConfig.projectName}!`,
        html
      );
    } catch {
      // Don't fail the waitlist signup if email fails
    }

    return NextResponse.json(entry[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 