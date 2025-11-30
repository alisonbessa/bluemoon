import { NextResponse } from "next/server";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { telegramUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Generate a secure random code
function generateVerificationCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

// GET - Generate connection link for authenticated user
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

  // Generate verification code
  const code = generateVerificationCode();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store the code temporarily (we'll store it when the user clicks the link)
  // For now, we encode it in the deep link itself
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "hivebudget_bot";

  // Create a deep link with the verification code
  // Format: https://t.me/botusername?start=connect_CODE_USERID
  const startParam = `connect_${code}_${userId}`;
  const deepLink = `https://t.me/${botUsername}?start=${startParam}`;

  return NextResponse.json({
    connected: false,
    deepLink,
    expiresAt: expiry.toISOString(),
    code, // Return code for verification on the server side
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
