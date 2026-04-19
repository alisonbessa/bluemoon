import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  whatsappUsers,
  whatsappPendingConnections,
  users,
} from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { getFirstName } from "@/shared/lib/string-utils";

const logger = createLogger("whatsapp:user-management");
const adapter = new WhatsAppAdapter();

// ============================================
// User Management
// ============================================

export async function getOrCreateWhatsAppUser(
  phoneNumber: string,
  displayName?: string
) {
  const now = new Date();

  const existing = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber))
    .limit(1);

  if (existing.length > 0) {
    // Always bump lastInboundAt so we know the 24h free-form window is open.
    const patch: Partial<typeof whatsappUsers.$inferInsert> = {
      lastInboundAt: now,
      updatedAt: now,
    };
    if (displayName && existing[0].displayName !== displayName) {
      patch.displayName = displayName;
    }
    await db
      .update(whatsappUsers)
      .set(patch)
      .where(eq(whatsappUsers.phoneNumber, phoneNumber));
    return { ...existing[0], ...patch };
  }

  const [newUser] = await db
    .insert(whatsappUsers)
    .values({
      phoneNumber,
      displayName,
      currentStep: "IDLE",
      context: {},
      lastInboundAt: now,
    })
    .returning();

  return newUser;
}

// ============================================
// Verification Code Flow
// ============================================

export function isVerificationCode(text: string): boolean {
  const code = extractVerificationCode(text);
  return code !== null;
}

// Extract a 6-char verification code from text (handles both raw codes and friendly messages)
export function extractVerificationCode(text: string): string | null {
  const trimmed = text.trim().toUpperCase();
  // Raw code: exactly 6 alphanumeric chars
  if (/^[A-Z2-9]{6}$/.test(trimmed)) return trimmed;
  // Friendly message: extract code after "é:" or similar patterns
  const match = trimmed.match(/\b([A-Z2-9]{6})\b/);
  return match ? match[1] : null;
}

export async function handleVerificationCode(
  phoneNumber: string,
  text: string
): Promise<boolean> {
  const normalizedCode = extractVerificationCode(text);
  if (!normalizedCode) return false;

  // Look up the code in pending connections
  const [pending] = await db
    .select()
    .from(whatsappPendingConnections)
    .where(
      and(
        eq(whatsappPendingConnections.code, normalizedCode),
        gt(whatsappPendingConnections.expiresAt, new Date())
      )
    );

  if (!pending) {
    return false; // Code not found or expired
  }

  const waUser = await getOrCreateWhatsAppUser(phoneNumber);

  // Check if this WhatsApp is already connected to a different user
  if (waUser.userId && waUser.userId !== pending.userId) {
    await adapter.sendMessage(
      phoneNumber,
      "Este WhatsApp já está conectado a outra conta.\n\n" +
        "Para conectar a uma conta diferente, primeiro desconecte no app."
    );
    return true;
  }

  // Check if this user already has a different WhatsApp connected
  const [existingConnection] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.userId, pending.userId));

  if (existingConnection && existingConnection.phoneNumber !== phoneNumber) {
    await adapter.sendMessage(
      phoneNumber,
      "Sua conta já está conectada a outro WhatsApp.\n\n" +
        "Desconecte primeiro nas Configurações do app."
    );
    return true;
  }

  // Connect the account
  await db
    .update(whatsappUsers)
    .set({
      userId: pending.userId,
      currentStep: "IDLE",
      context: {},
      updatedAt: new Date(),
    })
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  // Delete the used code
  await db
    .delete(whatsappPendingConnections)
    .where(eq(whatsappPendingConnections.id, pending.id));

  // Get user name for welcome message
  const [user] = await db
    .select({ displayName: users.displayName, name: users.name })
    .from(users)
    .where(eq(users.id, pending.userId));

  const firstName = getFirstName(user?.displayName) ?? getFirstName(user?.name);
  const greeting = firstName ? `Olá, *${firstName}*! ` : "";

  await adapter.sendMessage(
    phoneNumber,
    `*Conta conectada com sucesso!*\n\n` +
      `${greeting}Agora você pode registrar seus gastos enviando mensagens.\n\n` +
      `*Exemplos:*\n` +
      `- "gastei 50 no mercado"\n` +
      `- "paguei 200 de luz"\n` +
      `- "recebi 5000 de salário"\n\n` +
      `Envie *ajuda* para ver todos os comandos.`
  );

  return true;
}

// ============================================
// Subscription Access Check
// ============================================

export const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"];

/**
 * Checks if a user has an active subscription or exempt access.
 * Used to gate WhatsApp message processing for users without plans.
 */
export async function checkUserSubscriptionAccess(userId: string): Promise<boolean> {
  const [user] = await db
    .select({
      stripeSubscriptionId: users.stripeSubscriptionId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;

  // Check exempt roles (beta, admin) — TODO: reativar "lifetime" quando implementar LTD
  if (user.role && SUBSCRIPTION_EXEMPT_ROLES.includes(user.role)) {
    return true;
  }

  // Check active Stripe subscription
  if (user.stripeSubscriptionId) {
    return true;
  }

  // Check partner access (access through budget owner's subscription)
  const { checkPartnerAccess } = await import("@/shared/lib/users/checkPartnerAccess");
  return checkPartnerAccess(userId);
}
