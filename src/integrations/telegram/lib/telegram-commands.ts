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
      '❌ Link de conexão inválido. Gere um novo no app.'
    );
    return;
  }

  // Verify the user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    await sendMessage(
      chatId,
      '❌ Usuário não encontrado. Gere um novo link no app.'
    );
    return;
  }

  // Check for existing connections
  const connectionIssue = await checkExistingConnection(chatId, userId);

  if (connectionIssue?.type === 'telegram_connected_to_other') {
    await sendMessage(
      chatId,
      '❌ Este Telegram já está conectado a outra conta.\n\n' +
        'Desconecte primeiro nas Configurações do app.'
    );
    return;
  }

  if (connectionIssue?.type === 'user_has_other_telegram') {
    await sendMessage(
      chatId,
      '❌ Sua conta já está conectada a outro Telegram.\n\n' +
        'Desconecte primeiro nas Configurações do app.'
    );
    return;
  }

  // Connect the accounts
  await connectTelegramUser(chatId, userId, telegramUserId, username, firstName);

  const name = user.displayName || user.name || 'Usuário';

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

    const name = user[0]?.displayName || user[0]?.name || 'Usuário';

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
    await sendMessage(
      chatId,
      `👋 Bem-vindo ao <b>HiveBudget</b>!\n\n` +
        `Para registrar seus gastos pelo Telegram, você precisa conectar sua conta.\n\n` +
        `<b>Como conectar:</b>\n` +
        `1. Acesse o app em hivebudget.com\n` +
        `2. Vá em Configurações > Conectar Telegram\n` +
        `3. Clique no link gerado\n\n` +
        `Aguardando conexão...`
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
      await sendMessage(chatId, '❌ Código expirado. Gere um novo link no app.');
      return;
    }

    await sendMessage(
      chatId,
      `✅ <b>Conta conectada com sucesso!</b>\n\n` +
        `Agora você pode registrar seus gastos enviando mensagens.\n\n` +
        `<b>Exemplos:</b>\n` +
        `• <code>50</code> - Registra R$ 50,00\n` +
        `• <code>35,90 almoço</code> - R$ 35,90 com descrição\n\n` +
        `Use /ajuda para ver todos os comandos.`
    );

    await updateTelegramUser(chatId, 'IDLE', {});
  } else {
    await sendMessage(
      chatId,
      '❌ Código inválido. Tente gerar um novo link no app.'
    );
  }
}

/**
 * Handle /ajuda or /help command
 */
export async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `📚 <b>Comandos disponíveis:</b>\n\n` +
      `<b>💸 Registrar gastos:</b>\n` +
      `• <code>50</code> ou <code>50,90</code>\n` +
      `• <code>50 mercado</code> (com descrição)\n` +
      `• <code>200 em 3x</code> (parcelado)\n` +
      `• <code>35 almoço no flash</code> (com conta)\n\n` +
      `<b>💰 Registrar receitas:</b>\n` +
      `• <code>recebi 5000 de salário</code>\n` +
      `• <code>entrou o VR</code>\n\n` +
      `<b>📊 Consultas:</b>\n` +
      `• <code>quanto gastei esse mês?</code>\n` +
      `• <code>quanto sobrou em alimentação?</code>\n` +
      `• <code>como está minha meta de viagem?</code>\n` +
      `• <code>quanto tenho na poupança?</code>\n\n` +
      `<b>🔄 Transferências:</b>\n` +
      `• <code>transferi 500 pra poupança</code>\n\n` +
      `<b>⚙️ Comandos:</b>\n` +
      `/ajuda - Esta mensagem\n` +
      `/desfazer - Desfazer último registro\n` +
      `/cancelar - Cancelar operação atual\n\n` +
      `<b>💡 Dicas:</b>\n` +
      `• Você também pode enviar áudios!\n` +
      `• O bot confirma antes de salvar`
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
      '❌ Você precisa conectar sua conta primeiro. Use /start'
    );
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.lastTransactionId) {
    await sendMessage(chatId, '❌ Nenhuma transação recente para desfazer.');
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
      `✅ Transação desfeita!\n\n` +
        `Valor: ${formatCurrency(deleted[0].amount)}\n` +
        `Descrição: ${deleted[0].description || '(sem descrição)'}`
    );

    // Clear last transaction from context
    await updateTelegramUser(chatId, 'IDLE', {
      ...context,
      lastTransactionId: undefined,
    });
  } else {
    await sendMessage(
      chatId,
      '❌ Transação não encontrada ou já foi removida.'
    );
  }
}

/**
 * Handle /cancelar command
 */
export async function handleCancel(chatId: number) {
  await updateTelegramUser(chatId, 'IDLE', {});
  await sendMessage(chatId, '❌ Operação cancelada.');
}
