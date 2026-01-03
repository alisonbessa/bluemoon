import { NextResponse } from "next/server";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { telegramUsers, telegramPendingConnections } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// Generate a short, user-friendly verification code (6 characters)
function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like O, 0, I, 1
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

  // Check if user already has a connected Telegram account
  const [existingConnection] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  if (existingConnection) {
    return NextResponse.json({
      connected: true,
      username: existingConnection.username,
      firstName: existingConnection.firstName,
    });
  }

  // Check for existing valid pending connection
  const [existingPending] = await db
    .select()
    .from(telegramPendingConnections)
    .where(
      and(
        eq(telegramPendingConnections.userId, userId),
        gt(telegramPendingConnections.expiresAt, new Date())
      )
    );

  if (existingPending) {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "hivebudget_bot";
    return NextResponse.json({
      connected: false,
      code: existingPending.code,
      expiresAt: existingPending.expiresAt.toISOString(),
      botUsername,
      deepLink: `https://t.me/${botUsername}`,
    });
  }

  // Delete any expired codes for this user
  await db
    .delete(telegramPendingConnections)
    .where(eq(telegramPendingConnections.userId, userId));

  // Generate new verification code
  const code = generateShortCode();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store the pending connection
  await db.insert(telegramPendingConnections).values({
    code,
    userId,
    expiresAt: expiry,
  });

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "hivebudget_bot";

  return NextResponse.json({
    connected: false,
    code,
    expiresAt: expiry.toISOString(),
    botUsername,
    deepLink: `https://t.me/${botUsername}`,
  });
});

// POST - Complete connection (called from webhook after user clicks link)
export const POST = withAuthRequired(async (req, context) => {
  const { session } = context;
  const userId = session.user.id;

  const body = await req.json();
  const { chatId, telegramUserId, username, firstName } = body;

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  // Check if this Telegram account is already connected to another user
  const [existingTelegram] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (existingTelegram && existingTelegram.userId && existingTelegram.userId !== userId) {
    return NextResponse.json(
      { error: "This Telegram account is already connected to another user" },
      { status: 409 }
    );
  }

  // Check if user already has a different Telegram connected
  const [existingUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  if (existingUser && existingUser.chatId !== chatId) {
    return NextResponse.json(
      { error: "Your account is already connected to a different Telegram" },
      { status: 409 }
    );
  }

  // Update or create connection
  if (existingTelegram) {
    await db
      .update(telegramUsers)
      .set({
        userId,
        telegramUserId,
        username,
        firstName,
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.chatId, chatId));
  } else {
    await db.insert(telegramUsers).values({
      chatId,
      telegramUserId,
      username,
      firstName,
      userId,
    });
  }

  return NextResponse.json({ success: true });
});

// DELETE - Disconnect Telegram
export const DELETE = withAuthRequired(async (_req, context) => {
  const { session } = context;
  const userId = session.user.id;

  await db
    .delete(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  return NextResponse.json({ success: true });
});
