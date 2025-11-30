import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { handleMessage, handleCallbackQuery } from "@/lib/telegram/handlers";

// Verify the request is from Telegram (optional but recommended)
function verifyTelegramRequest(request: NextRequest): boolean {
  // You can add secret token verification here
  // The secret is set when configuring the webhook
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  // If no secret is configured, allow all requests (not recommended for production)
  if (!expectedToken) {
    return true;
  }

  return secretToken === expectedToken;
}

export async function POST(request: NextRequest) {
  try {
    // Verify request origin
    if (!verifyTelegramRequest(request)) {
      console.warn("[Telegram Webhook] Invalid secret token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update: TelegramUpdate = await request.json();

    // Log for debugging (remove in production)
    console.log("[Telegram Webhook] Received update:", JSON.stringify(update, null, 2));

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Always return 200 to Telegram to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error processing update:", error);
    // Still return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true, error: "Internal error" });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "telegram-webhook",
    timestamp: new Date().toISOString(),
  });
}
