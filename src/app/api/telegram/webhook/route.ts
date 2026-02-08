import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/integrations/telegram/lib/types";
import { handleMessage, handleCallbackQuery } from "@/integrations/telegram/lib/handlers";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:telegram-webhook");

// Verify the request is from Telegram (required for security)
function verifyTelegramRequest(request: NextRequest): boolean {
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  // SECURITY: Webhook secret is required in production
  if (!expectedToken) {
    logger.error("SECURITY: TELEGRAM_WEBHOOK_SECRET not configured");
    return false;
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

    // Log update ID only (not full payload) for debugging
    if (process.env.NODE_ENV === "development") {
      logger.info("Received update", { updateId: update.update_id });
    }

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Always return 200 to Telegram to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error processing update", error);
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
