import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { whatsappUsers, transactions, financialAccounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ConversationContext } from "@/integrations/messaging/lib/types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { handleQueryIntent } from "@/integrations/messaging/lib/query-executor";
import {
  getUserBudgetInfo,
  buildUserContext,
} from "@/integrations/messaging/lib/user-context";
import { markLogAsCancelled } from "@/integrations/messaging/lib/ai-logger";
import { formatCurrency } from "@/shared/lib/formatters";

const logger = createLogger("whatsapp:commands");
const adapter = new WhatsAppAdapter();

// ============================================
// Command Handlers (text-based, no / prefix)
// ============================================

export function isCommand(text: string): string | null {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (normalized === "ajuda" || normalized === "help") return "ajuda";
  if (normalized === "cancelar" || normalized === "cancel") return "cancelar";
  if (normalized === "desfazer" || normalized === "undo") return "desfazer";
  if (normalized === "start" || normalized === "iniciar") return "start";
  if (normalized === "saldo" || normalized === "resumo" || normalized === "balance") return "saldo";

  return null;
}

export async function handleHelp(phoneNumber: string): Promise<void> {
  await adapter.sendMessage(
    phoneNumber,
    `*O que posso fazer:*\n\n` +
      `*Registrar gastos:*\n` +
      `"gastei 50 no mercado"\n` +
      `"paguei 200 de luz"\n` +
      `"comprei 100 em 3x no cartao"\n\n` +
      `*Registrar receitas:*\n` +
      `"recebi 5000 de salario"\n` +
      `"entrou 150 de freelance"\n\n` +
      `*Transferencias:*\n` +
      `"transferi 500 do itau para nubank"\n\n` +
      `*Consultas:*\n` +
      `"quanto gastei esse mes?"\n` +
      `"quanto sobrou em alimentacao?"\n` +
      `"como esta minha meta de viagem?"\n\n` +
      `*Comandos:*\n` +
      `saldo - Resumo do mes\n` +
      `ajuda - Esta mensagem\n` +
      `desfazer - Desfazer ultimo registro\n` +
      `cancelar - Cancelar operacao atual`
  );
}

export async function handleBalance(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(phoneNumber, "Voce precisa conectar sua conta primeiro.");
    return;
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);

  if (!budgetInfo) {
    await adapter.sendMessage(
      phoneNumber,
      "Voce precisa configurar seu orcamento primeiro no app."
    );
    return;
  }

  const userContext = buildUserContext(waUser.userId, budgetInfo);

  await handleQueryIntent(
    adapter,
    phoneNumber,
    "QUERY_BALANCE",
    { queryType: "balance" },
    userContext
  );
}

export async function handleCancel(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(phoneNumber, "Voce precisa conectar sua conta primeiro.");
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  // Cancel any pending AI log
  if (context.lastAILogId) {
    await markLogAsCancelled(context.lastAILogId);
  }

  await adapter.updateState(phoneNumber, "IDLE", {});
  await adapter.sendMessage(phoneNumber, "Operacao cancelada.");
}

export async function handleUndo(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(phoneNumber, "Voce precisa conectar sua conta primeiro.");
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.lastTransactionId) {
    await adapter.sendMessage(phoneNumber, "Nenhuma transacao recente para desfazer.");
    return;
  }

  // Get the transaction to find account info
  const [txToDelete] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, context.lastTransactionId));

  if (!txToDelete) {
    await adapter.sendMessage(
      phoneNumber,
      "Transacao nao encontrada ou ja foi removida."
    );
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
      // Reverse expense: add back to balance
      await db
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} + ${tx.amount}` })
        .where(eq(financialAccounts.id, tx.accountId));
    } else if (tx.type === "income") {
      // Reverse income: subtract from balance
      await db
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${tx.amount}` })
        .where(eq(financialAccounts.id, tx.accountId));
    } else if (tx.type === "transfer") {
      // Reverse transfer: add back to source, subtract from destination
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

  await adapter.sendMessage(
    phoneNumber,
    `Transacao desfeita!\n\n` +
      `Valor: ${formatCurrency(txToDelete.amount)}\n` +
      `Descricao: ${txToDelete.description || "(sem descricao)"}`
  );

  // Clear last transaction from context
  await adapter.updateState(phoneNumber, "IDLE", {
    ...context,
    lastTransactionId: undefined,
  });
}
