import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  telegramUsers,
  telegramPendingConnections,
  users,
} from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import type { TelegramConversationStep, TelegramConversationContext } from "@/db/schema/telegram-users";
import { sendMessage } from "./bot";

const logger = createLogger("telegram:user-management");

// Get or create telegram user state
export async function getOrCreateTelegramUser(chatId: number, telegramUserId?: number, username?: string, firstName?: string) {
  const existing = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(telegramUsers)
    .values({
      chatId,
      telegramUserId,
      username,
      firstName,
    })
    .returning();

  return newUser;
}

// Update telegram user state
export async function updateTelegramUser(
  chatId: number,
  step: TelegramConversationStep,
  context: TelegramConversationContext
) {
  await db
    .update(telegramUsers)
    .set({
      currentStep: step,
      context,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));
}

// Handle connection request from deep link
export async function handleConnectionRequest(chatId: number, telegramUserId: number, username?: string, firstName?: string, userId?: string) {
  if (!userId) {
    await sendMessage(chatId, "❌ Link de conexão inválido. Gere um novo no app.");
    return;
  }

  // Verify the user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    await sendMessage(chatId, "❌ Usuário não encontrado. Gere um novo link no app.");
    return;
  }

  // Check if this Telegram is already connected to another user
  const [existingTelegram] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (existingTelegram && existingTelegram.userId && existingTelegram.userId !== userId) {
    await sendMessage(
      chatId,
      "❌ Este Telegram já está conectado a outra conta.\n\n" +
        "Desconecte primeiro nas Configurações do app."
    );
    return;
  }

  // Check if user already has a different Telegram connected
  const [existingUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  if (existingUser && existingUser.chatId !== chatId) {
    await sendMessage(
      chatId,
      "❌ Sua conta já está conectada a outro Telegram.\n\n" +
        "Desconecte primeiro nas Configurações do app."
    );
    return;
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
        currentStep: "IDLE",
        context: {},
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
      currentStep: "IDLE",
      context: {},
    });
  }

  const name = user.displayName || user.name || "Usuário";

  await sendMessage(
    chatId,
    `✅ <b>Conta conectada com sucesso!</b>\n\n` +
      `Olá, <b>${name}</b>! Agora você pode registrar seus gastos enviando mensagens.\n\n` +
      `<b>Como usar:</b>\n` +
      `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
      `• Com descrição: <code>50 mercado</code>\n\n` +
      `Use /ajuda para ver todos os comandos.`
  );
}

// Handle /start command
export async function handleStart(chatId: number, telegramUserId: number, username?: string, firstName?: string, startParam?: string) {
  const telegramUser = await getOrCreateTelegramUser(chatId, telegramUserId, username, firstName);

  // Check if this is a connection request with userId
  // Format: connect_CODE_USERID (userId is a UUID with hyphens)
  if (startParam && startParam.startsWith("connect_")) {
    // Remove "connect_" prefix, then split only on first underscore to get code and userId
    const withoutPrefix = startParam.substring(8); // Remove "connect_"
    const firstUnderscoreIndex = withoutPrefix.indexOf("_");
    if (firstUnderscoreIndex > 0) {
      const userId = withoutPrefix.substring(firstUnderscoreIndex + 1); // Everything after the code
      return handleConnectionRequest(chatId, telegramUserId, username, firstName, userId);
    }
  }

  if (telegramUser.userId) {
    // Already connected
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, telegramUser.userId))
      .limit(1);

    const name = user[0]?.displayName || user[0]?.name || "Usuário";

    await sendMessage(
      chatId,
      `👋 Olá, <b>${name}</b>!\n\n` +
        `Sua conta já está conectada.\n\n` +
        `<b>Como registrar gastos:</b>\n` +
        `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
        `• Com descrição: <code>50 mercado</code>\n\n` +
        `<b>Comandos:</b>\n` +
        `/ajuda - Ver todos os comandos\n` +
        `/desfazer - Desfazer último registro`
    );
  } else {
    // Not connected
    const appUrl = process.env.NEXTAUTH_URL || "https://www.hivebudget.com";
    await sendMessage(
      chatId,
      `👋 Bem-vindo ao <b>HiveBudget</b>!\n\n` +
        `Para registrar seus gastos pelo Telegram, conecte sua conta.\n\n` +
        `<b>Ainda não tem conta?</b>\n` +
        `Cadastre-se grátis: ${appUrl}/sign-up\n\n` +
        `<b>Já tem conta?</b>\n` +
        `1. Acesse ${appUrl}\n` +
        `2. Vá em Configurações > Conectar Telegram\n` +
        `3. Copie o código de 6 caracteres\n` +
        `4. Envie o código aqui neste chat\n\n` +
        `Aguardando seu código...`
    );
  }
}

// Check if a string looks like a verification code (6 uppercase alphanumeric)
export function isVerificationCode(text: string): boolean {
  return /^[A-Z2-9]{6}$/.test(text.toUpperCase());
}

// Handle verification code for connection
export async function handleVerificationCodeConnection(
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
  firstName: string | undefined,
  code: string
): Promise<boolean> {
  // Normalize code to uppercase
  const normalizedCode = code.toUpperCase().trim();

  // Look up the code in pending connections
  const [pending] = await db
    .select()
    .from(telegramPendingConnections)
    .where(
      and(
        eq(telegramPendingConnections.code, normalizedCode),
        gt(telegramPendingConnections.expiresAt, new Date())
      )
    );

  if (!pending) {
    return false; // Code not found or expired
  }

  // Get or create telegram user
  const telegramUser = await getOrCreateTelegramUser(chatId, telegramUserId, username, firstName);

  // Check if this Telegram is already connected to a different user
  if (telegramUser.userId && telegramUser.userId !== pending.userId) {
    await sendMessage(
      chatId,
      `❌ Este Telegram já está conectado a outra conta.\n\n` +
        `Para conectar a uma conta diferente, primeiro desconecte no app atual.`
    );
    return true; // Code was valid, just can't connect
  }

  // Connect the account
  await db
    .update(telegramUsers)
    .set({
      userId: pending.userId,
      telegramUserId,
      username,
      firstName,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));

  // Delete the used code
  await db
    .delete(telegramPendingConnections)
    .where(eq(telegramPendingConnections.id, pending.id));

  // Get user name for welcome message
  const [user] = await db
    .select({ displayName: users.displayName, name: users.name })
    .from(users)
    .where(eq(users.id, pending.userId));

  const userName = user?.displayName || user?.name || "Usuário";

  await sendMessage(
    chatId,
    `✅ <b>Conta conectada com sucesso!</b>\n\n` +
      `Olá, <b>${userName}</b>! Agora você pode registrar seus gastos enviando mensagens.\n\n` +
      `<b>Exemplos:</b>\n` +
      `• <code>50</code> - Registra R$ 50,00\n` +
      `• <code>35,90 almoço</code> - R$ 35,90 com descrição\n\n` +
      `Use /ajuda para ver todos os comandos.`
  );

  return true;
}
