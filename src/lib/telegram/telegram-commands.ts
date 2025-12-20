/**
 * Telegram Command Handlers
 *
 * Handles /start, /help, /undo, /cancel commands
 */

import { db } from '@/db';
import { users, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { TelegramConversationContext } from '@/db/schema/telegram-users';
import { sendMessage, formatCurrency } from './bot';
import {
  getOrCreateTelegramUser,
  updateTelegramUser,
  getTelegramUser,
  checkExistingConnection,
  connectTelegramUser,
} from './telegram-user.repository';

/**
 * Handle connection request from deep link
 */
export async function handleConnectionRequest(
  chatId: number,
  telegramUserId: number,
  username?: string,
  firstName?: string,
  userId?: string
) {
  if (!userId) {
    await sendMessage(
      chatId,
      '❌ Link de conexao invalido. Gere um novo no app.'
    );
    return;
  }

  // Verify the user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    await sendMessage(
      chatId,
      '❌ Usuario nao encontrado. Gere um novo link no app.'
    );
    return;
  }

  // Check for existing connections
  const connectionIssue = await checkExistingConnection(chatId, userId);

  if (connectionIssue?.type === 'telegram_connected_to_other') {
    await sendMessage(
      chatId,
      '❌ Este Telegram ja esta conectado a outra conta.\n\n' +
        'Desconecte primeiro nas Configuracoes do app.'
    );
    return;
  }

  if (connectionIssue?.type === 'user_has_other_telegram') {
    await sendMessage(
      chatId,
      '❌ Sua conta ja esta conectada a outro Telegram.\n\n' +
        'Desconecte primeiro nas Configuracoes do app.'
    );
    return;
  }

  // Connect the accounts
  await connectTelegramUser(chatId, userId, telegramUserId, username, firstName);

  const name = user.displayName || user.name || 'Usuario';

  await sendMessage(
    chatId,
    `✅ <b>Conta conectada com sucesso!</b>\n\n` +
      `Ola, <b>${name}</b>! Agora voce pode registrar seus gastos enviando mensagens.\n\n` +
      `<b>Como usar:</b>\n` +
      `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
      `• Com descricao: <code>50 mercado</code>\n\n` +
      `Use /ajuda para ver todos os comandos.`
  );
}

/**
 * Handle /start command
 */
export async function handleStart(
  chatId: number,
  telegramUserId: number,
  username?: string,
  firstName?: string,
  startParam?: string
) {
  const telegramUser = await getOrCreateTelegramUser(
    chatId,
    telegramUserId,
    username,
    firstName
  );

  // Check if this is a connection request with userId
  // Format: connect_CODE_USERID
  if (startParam && startParam.startsWith('connect_')) {
    const parts = startParam.split('_');
    if (parts.length >= 3) {
      const userId = parts[parts.length - 1]; // Last part is userId
      return handleConnectionRequest(
        chatId,
        telegramUserId,
        username,
        firstName,
        userId
      );
    }
  }

  if (telegramUser.userId) {
    // Already connected
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, telegramUser.userId))
      .limit(1);

    const name = user[0]?.displayName || user[0]?.name || 'Usuario';

    await sendMessage(
      chatId,
      `👋 Ola, <b>${name}</b>!\n\n` +
        `Sua conta ja esta conectada.\n\n` +
        `<b>Como registrar gastos:</b>\n` +
        `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
        `• Com descricao: <code>50 mercado</code>\n\n` +
        `<b>Comandos:</b>\n` +
        `/ajuda - Ver todos os comandos\n` +
        `/desfazer - Desfazer ultimo registro`
    );
  } else {
    // Not connected
    await sendMessage(
      chatId,
      `👋 Bem-vindo ao <b>HiveBudget</b>!\n\n` +
        `Para registrar seus gastos pelo Telegram, voce precisa conectar sua conta.\n\n` +
        `<b>Como conectar:</b>\n` +
        `1. Acesse o app em hivebudget.com.br\n` +
        `2. Va em Configuracoes > Conectar Telegram\n` +
        `3. Clique no link gerado\n\n` +
        `Aguardando conexao...`
    );
  }
}

/**
 * Handle verification code for connection
 */
export async function handleVerificationCode(chatId: number, code: string) {
  const telegramUser = await getTelegramUser(chatId);

  if (!telegramUser) {
    await sendMessage(chatId, '❌ Erro ao conectar. Tente novamente.');
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (context.verificationCode === code) {
    // Check expiry
    if (
      context.verificationExpiry &&
      new Date(context.verificationExpiry) < new Date()
    ) {
      await sendMessage(chatId, '❌ Codigo expirado. Gere um novo link no app.');
      return;
    }

    await sendMessage(
      chatId,
      `✅ <b>Conta conectada com sucesso!</b>\n\n` +
        `Agora voce pode registrar seus gastos enviando mensagens.\n\n` +
        `<b>Exemplos:</b>\n` +
        `• <code>50</code> - Registra R$ 50,00\n` +
        `• <code>35,90 almoco</code> - R$ 35,90 com descricao\n\n` +
        `Use /ajuda para ver todos os comandos.`
    );

    await updateTelegramUser(chatId, 'IDLE', {});
  } else {
    await sendMessage(
      chatId,
      '❌ Codigo invalido. Tente gerar um novo link no app.'
    );
  }
}

/**
 * Handle /ajuda or /help command
 */
export async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `📚 <b>Comandos disponiveis:</b>\n\n` +
      `<b>Registrar gastos:</b>\n` +
      `• Envie apenas o valor: <code>50</code>\n` +
      `• Com descricao: <code>50 mercado</code>\n` +
      `• Com virgula: <code>35,90</code>\n\n` +
      `<b>Comandos:</b>\n` +
      `/ajuda - Esta mensagem\n` +
      `/desfazer - Desfazer ultimo registro\n` +
      `/cancelar - Cancelar operacao atual\n\n` +
      `<b>Dicas:</b>\n` +
      `• O bot ira perguntar a categoria\n` +
      `• Voce pode confirmar ou cancelar antes de salvar`
  );
}

/**
 * Handle /desfazer command
 */
export async function handleUndo(chatId: number) {
  const telegramUser = await getTelegramUser(chatId);

  if (!telegramUser?.userId) {
    await sendMessage(
      chatId,
      '❌ Voce precisa conectar sua conta primeiro. Use /start'
    );
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.lastTransactionId) {
    await sendMessage(chatId, '❌ Nenhuma transacao recente para desfazer.');
    return;
  }

  // Delete the last transaction
  const deleted = await db
    .delete(transactions)
    .where(eq(transactions.id, context.lastTransactionId))
    .returning();

  if (deleted.length > 0) {
    await sendMessage(
      chatId,
      `✅ Transacao desfeita!\n\n` +
        `Valor: ${formatCurrency(deleted[0].amount)}\n` +
        `Descricao: ${deleted[0].description || '(sem descricao)'}`
    );

    // Clear last transaction from context
    await updateTelegramUser(chatId, 'IDLE', {
      ...context,
      lastTransactionId: undefined,
    });
  } else {
    await sendMessage(
      chatId,
      '❌ Transacao nao encontrada ou ja foi removida.'
    );
  }
}

/**
 * Handle /cancelar command
 */
export async function handleCancel(chatId: number) {
  await updateTelegramUser(chatId, 'IDLE', {});
  await sendMessage(chatId, '❌ Operacao cancelada.');
}
