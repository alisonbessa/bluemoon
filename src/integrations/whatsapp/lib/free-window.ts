import { db } from "@/db";
import { whatsappUsers } from "@/db/schema";
import { and, eq, gte, isNotNull } from "drizzle-orm";

// Meta's Customer Service Window: 24h from the last user-initiated message.
// Inside this window we can send free-form messages. Outside, only approved
// template messages work — and those are billable per Meta's pricing, so we
// skip outbound notifications when the window is closed.
const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Returns true when the user has a WhatsApp account linked AND a message
 * was received from them within the last 24h. Callers MUST gate any
 * proactive outbound WhatsApp message on this check to avoid paying for
 * billable template messages unintentionally.
 */
export async function isWhatsAppFreeWindowOpen(userId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - FREE_WINDOW_MS);
  const [row] = await db
    .select({ phoneNumber: whatsappUsers.phoneNumber })
    .from(whatsappUsers)
    .where(
      and(
        eq(whatsappUsers.userId, userId),
        isNotNull(whatsappUsers.lastInboundAt),
        gte(whatsappUsers.lastInboundAt, cutoff),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Resolves the phone number of a user only when the 24h window is still open.
 * Returns null when the user has no WhatsApp linked or the window is closed.
 */
export async function getOpenWindowPhoneNumber(userId: string): Promise<string | null> {
  const cutoff = new Date(Date.now() - FREE_WINDOW_MS);
  const [row] = await db
    .select({ phoneNumber: whatsappUsers.phoneNumber })
    .from(whatsappUsers)
    .where(
      and(
        eq(whatsappUsers.userId, userId),
        isNotNull(whatsappUsers.lastInboundAt),
        gte(whatsappUsers.lastInboundAt, cutoff),
      ),
    )
    .limit(1);
  return row?.phoneNumber ?? null;
}
