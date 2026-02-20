import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/integrations/whatsapp/lib/handlers";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:whatsapp-webhook");

// GET - WhatsApp webhook verification (Meta requires this)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    logger.error("WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured");
    return new NextResponse("Configuration error", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn("Webhook verification failed", { mode, tokenMatch: token === verifyToken });
  return new NextResponse("Forbidden", { status: 403 });
}

// POST - Receive webhook events from WhatsApp
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (process.env.NODE_ENV === "development") {
      logger.info("Received webhook", { object: payload.object });
    }

    // Only process whatsapp_business_account events
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    await handleWebhook(payload);

    // Always return 200 to Meta to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Error processing webhook", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ ok: true, error: "Internal error" });
  }
}
