import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  telegramUsers,
  transactions,
  financialAccounts,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { TelegramConversationContext } from "@/db/schema/telegram-users";
import { getUserBudgetInfo, buildUserContext } from "@/integrations/messaging/lib/user-context";
import {
  sendMessage,
  formatCurrency,
  createCategoryKeyboard,
} from "./bot";
import { handleQueryIntent } from "./query-executor";
import { parseAmount } from "./telegram-utils";
import { updateTelegramUser } from "./user-management";

const logger = createLogger("telegram:commands");

// Handle /ajuda or /help command
export async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `📚 <b>O que posso fazer:</b>\n\n` +
      `<b>Registrar gastos:</b>\n` +
      `"gastei 50 no mercado"\n` +
      `"paguei 200 de luz"\n\n` +
      `<b>Registrar receitas:</b>\n` +
      `"recebi 5000 de salário"\n` +
      `"entrou 150 de freelance"\n\n` +
      `<b>Consultas:</b>\n` +
      `"quanto gastei esse mês?"\n` +
      `"quanto sobrou em alimentação?"\n` +
      `"como está minha meta de viagem?"\n\n` +
      `<b>Áudio:</b>\n` +
      `Envie uma mensagem de voz!\n\n` +
      `<b>Comandos:</b>\n` +
      `/saldo - Resumo do mês\n` +
      `/ajuda - Esta mensagem\n` +
      `/desfazer - Desfazer último registro\n` +
      `/cancelar - Cancelar operação atual`
  );
}

// Handle /desfazer command
export async function handleUndo(chatId: number) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(chatId, "❌ Você precisa conectar sua conta primeiro. Use /start");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.lastTransactionId) {
    await sendMessage(chatId, "❌ Nenhuma transação recente para desfazer.");
    return;
  }

  // Get the transaction to find account info
  const [txToDelete] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, context.lastTransactionId));

  if (!txToDelete) {
    await sendMessage(chatId, "❌ Transação não encontrada ou já foi removida.");
    return;
  }

  // Get child installments to reverse their balances too
  const childTxs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.parentTransactionId, context.lastTransactionId));

  // Reverse balance for all transactions (parent + children)
  const allTxs = [txToDelete, ...childTxs];
  for (const tx of allTxs) {
    if (!tx.accountId) continue;
    if (tx.type === "expense") {
      await db
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} + ${tx.amount}` })
        .where(eq(financialAccounts.id, tx.accountId));
    } else if (tx.type === "income") {
      await db
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${tx.amount}` })
        .where(eq(financialAccounts.id, tx.accountId));
    } else if (tx.type === "transfer") {
      await db
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} + ${tx.amount}` })
        .where(eq(financialAccounts.id, tx.accountId));
      if (tx.toAccountId) {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${tx.amount}` })
          .where(eq(financialAccounts.id, tx.toAccountId));
      }
    }
  }

  // Delete child installments first
  if (childTxs.length > 0) {
    await db
      .delete(transactions)
      .where(eq(transactions.parentTransactionId, context.lastTransactionId));
  }

  // Delete the parent transaction
  await db
    .delete(transactions)
    .where(eq(transactions.id, context.lastTransactionId));

  await sendMessage(
    chatId,
    `✅ Transação desfeita!\n\n` +
      `Valor: ${formatCurrency(txToDelete.amount)}\n` +
      `Descrição: ${txToDelete.description || "(sem descrição)"}`
  );

  // Clear last transaction from context
  await updateTelegramUser(chatId, "IDLE", {
    ...context,
    lastTransactionId: undefined,
  });
}

// Handle /saldo command - quick balance summary
export async function handleBalance(chatId: number) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(chatId, "❌ Você precisa conectar sua conta primeiro. Use /start");
    return;
  }

  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo) {
    await sendMessage(
      chatId,
      "❌ Você precisa configurar seu orçamento primeiro no app."
    );
    return;
  }

  const userContext = buildUserContext(telegramUser.userId, budgetInfo);

  await handleQueryIntent(
    chatId,
    "QUERY_BALANCE",
    { queryType: "balance" },
    userContext
  );
}

// Handle /cancelar command
export async function handleCancel(chatId: number) {
  await updateTelegramUser(chatId, "IDLE", {});
  await sendMessage(chatId, "❌ Operação cancelada.");
}

// Handle expense input (amount with optional description)
export async function handleExpenseInput(chatId: number, text: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(
      chatId,
      "❌ Você precisa conectar sua conta primeiro.\n\n" +
        "Acesse o app e vá em Configurações > Conectar Telegram"
    );
    return;
  }

  // Parse amount and description
  const parts = text.trim().split(/\s+/);
  const amountText = parts[0];
  const description = parts.slice(1).join(" ") || undefined;

  const amount = parseAmount(amountText);

  if (!amount) {
    await sendMessage(
      chatId,
      "❌ Valor inválido.\n\n" +
        "Envie um valor como:\n" +
        "• <code>50</code>\n" +
        "• <code>35,90</code>\n" +
        "• <code>50 mercado</code>"
    );
    return;
  }

  // Get user's budget info
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await sendMessage(
      chatId,
      "❌ Você precisa configurar seu orçamento primeiro no app.\n\n" +
        "Acesse hivebudget.com e complete a configuração."
    );
    return;
  }

  // Store pending expense and ask for category
  await updateTelegramUser(chatId, "AWAITING_CATEGORY", {
    pendingExpense: {
      amount,
      description,
    },
  });

  await sendMessage(
    chatId,
    `💰 <b>Registrar gasto</b>\n\n` +
      `Valor: <b>${formatCurrency(amount)}</b>\n` +
      (description ? `Descrição: ${description}\n\n` : "\n") +
      `Selecione a categoria:`,
    {
      replyMarkup: createCategoryKeyboard(budgetInfo.categories),
    }
  );
}
