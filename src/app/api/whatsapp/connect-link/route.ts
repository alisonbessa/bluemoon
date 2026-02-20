import { NextResponse } from "next/server";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { whatsappUsers, whatsappPendingConnections } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// Generate a short, user-friendly verification code (6 characters)
function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// GET - Generate connection code for authenticated user
export const GET = withAuthRequired(async (_req, context) => {
  const { session } = context;
  const userId = session.user.id;

  // Check if user already has a connected WhatsApp account
  const [existingConnection] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.userId, userId));

  if (existingConnection) {
    return NextResponse.json({
      connected: true,
      phoneNumber: existingConnection.phoneNumber,
      displayName: existingConnection.displayName,
    });
  }

  // Check for existing valid pending connection
  const [existingPending] = await db
    .select()
    .from(whatsappPendingConnections)
    .where(
      and(
        eq(whatsappPendingConnections.userId, userId),
        gt(whatsappPendingConnections.expiresAt, new Date())
      )
    );

  if (existingPending) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
    return NextResponse.json({
      connected: false,
      code: existingPending.code,
      expiresAt: existingPending.expiresAt.toISOString(),
      whatsappNumber,
      deepLink: `https://wa.me/${whatsappNumber}`,
    });
  }

  // Delete any expired codes for this user
  await db
    .delete(whatsappPendingConnections)
    .where(eq(whatsappPendingConnections.userId, userId));

  // Generate new verification code
  const code = generateShortCode();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store the pending connection
  await db.insert(whatsappPendingConnections).values({
    code,
    userId,
    expiresAt: expiry,
  });

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  return NextResponse.json({
    connected: false,
    code,
    expiresAt: expiry.toISOString(),
    whatsappNumber,
    deepLink: `https://wa.me/${whatsappNumber}`,
  });
});

// DELETE - Disconnect WhatsApp
export const DELETE = withAuthRequired(async (_req, context) => {
  const { session } = context;
  const userId = session.user.id;

  await db
    .delete(whatsappUsers)
    .where(eq(whatsappUsers.userId, userId));

  return NextResponse.json({ success: true });
});
