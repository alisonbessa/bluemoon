import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  whatsappUsers,
  whatsappPendingConnections,
  transactions,
  categories,
  financialAccounts,
  users,
  groups,
} from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import type {
  ConversationStep,
  ConversationContext,
  UserContext,
  ChatId,
} from "@/integrations/messaging/lib/types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { parseUserMessage } from "@/integrations/messaging/lib/gemini";
import { routeIntent } from "@/integrations/messaging/lib/intent-router";
import {
  getUserBudgetInfo,
  buildUserContext,
} from "@/integrations/messaging/lib/user-context";
import {
  markLogAsConfirmed,
  markLogAsCancelled,
} from "@/integrations/messaging/lib/ai-logger";
import { markTransactionAsPaid } from "@/integrations/messaging/lib/transaction-matcher";
import { getTodayNoonUTC } from "@/integrations/messaging/lib/utils";
import {
  getFirstInstallmentDate,
  calculateInstallmentDates,
} from "@/shared/lib/billing-cycle";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { formatCurrency } from "@/shared/lib/formatters";
import { handleVoiceMessage } from "./voice-handler";

const logger = createLogger("whatsapp:handlers");
const adapter = new WhatsAppAdapter();

// ============================================
// WhatsApp Webhook Payload Types
// ============================================

interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: "whatsapp";
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<WhatsAppMessage>;
        statuses?: Array<unknown>;
      };
      field: "messages";
    }>;
  }>;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string; // "text" | "interactive" | "audio" | "image" | "video" | "document" | "sticker" | "location" | "reaction" | etc.
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  audio?: { id: string; mime_type: string; voice?: boolean };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string };
  sticker?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  reaction?: { message_id: string; emoji: string };
}

// ============================================
// User Management
// ============================================

async function getOrCreateWhatsAppUser(
  phoneNumber: string,
  displayName?: string
) {
  const existing = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber))
    .limit(1);

  if (existing.length > 0) {
    // Update display name if provided and different
    if (displayName && existing[0].displayName !== displayName) {
      await db
        .update(whatsappUsers)
        .set({ displayName, updatedAt: new Date() })
        .where(eq(whatsappUsers.phoneNumber, phoneNumber));
    }
    return existing[0];
  }

  const [newUser] = await db
    .insert(whatsappUsers)
    .values({
      phoneNumber,
      displayName,
      currentStep: "IDLE",
      context: {},
    })
    .returning();

  return newUser;
}

// ============================================
// Verification Code Flow
// ============================================

function isVerificationCode(text: string): boolean {
  const code = extractVerificationCode(text);
  return code !== null;
}

// Extract a 6-char verification code from text (handles both raw codes and friendly messages)
function extractVerificationCode(text: string): string | null {
  const trimmed = text.trim().toUpperCase();
  // Raw code: exactly 6 alphanumeric chars
  if (/^[A-Z2-9]{6}$/.test(trimmed)) return trimmed;
  // Friendly message: extract code after "é:" or similar patterns
  const match = trimmed.match(/\b([A-Z2-9]{6})\b/);
  return match ? match[1] : null;
}

async function handleVerificationCode(
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

  const userName = user?.displayName || user?.name || "Usuário";

  await adapter.sendMessage(
    phoneNumber,
    `*Conta conectada com sucesso!*\n\n` +
      `Olá, *${userName}*! Agora você pode registrar seus gastos enviando mensagens.\n\n` +
      `*Exemplos:*\n` +
      `- "gastei 50 no mercado"\n` +
      `- "paguei 200 de luz"\n` +
      `- "recebi 5000 de salário"\n\n` +
      `Envie *ajuda* para ver todos os comandos.`
  );

  return true;
}

// ============================================
// Command Handlers (text-based, no / prefix)
// ============================================

function isCommand(text: string): string | null {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (normalized === "ajuda" || normalized === "help") return "ajuda";
  if (normalized === "cancelar" || normalized === "cancel") return "cancelar";
  if (normalized === "desfazer" || normalized === "undo") return "desfazer";
  if (normalized === "start" || normalized === "iniciar") return "start";

  return null;
}

async function handleHelp(phoneNumber: string): Promise<void> {
  await adapter.sendMessage(
    phoneNumber,
    `*O que posso fazer:*\n\n` +
      `*Registrar gastos:*\n` +
      `"gastei 50 no mercado"\n` +
      `"paguei 200 de luz"\n` +
      `"comprei 100 em 3x no cartão"\n\n` +
      `*Registrar receitas:*\n` +
      `"recebi 5000 de salário"\n` +
      `"entrou 150 de freelance"\n\n` +
      `*Transferências:*\n` +
      `"transferi 500 do itaú para nubank"\n\n` +
      `*Consultas:*\n` +
      `"quanto gastei esse mês?"\n` +
      `"quanto sobrou em alimentação?"\n` +
      `"como está minha meta de viagem?"\n\n` +
      `*Comandos:*\n` +
      `ajuda - Esta mensagem\n` +
      `desfazer - Desfazer último registro\n` +
      `cancelar - Cancelar operação atual`
  );
}

async function handleCancel(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(phoneNumber, "Você precisa conectar sua conta primeiro.");
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  // Cancel any pending AI log
  if (context.lastAILogId) {
    await markLogAsCancelled(context.lastAILogId);
  }

  await adapter.updateState(phoneNumber, "IDLE", {});
  await adapter.sendMessage(phoneNumber, "Operação cancelada.");
}

async function handleUndo(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(phoneNumber, "Você precisa conectar sua conta primeiro.");
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.lastTransactionId) {
    await adapter.sendMessage(phoneNumber, "Nenhuma transação recente para desfazer.");
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
      "Transação não encontrada ou já foi removida."
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
    `Transação desfeita!\n\n` +
      `Valor: ${formatCurrency(txToDelete.amount)}\n` +
      `Descrição: ${txToDelete.description || "(sem descrição)"}`
  );

  // Clear last transaction from context
  await adapter.updateState(phoneNumber, "IDLE", {
    ...context,
    lastTransactionId: undefined,
  });
}

// ============================================
// AI Message Processing
// ============================================

async function handleAIMessage(
  phoneNumber: string,
  text: string,
  userId: string
): Promise<void> {
  const budgetInfo = await getUserBudgetInfo(userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await adapter.sendMessage(
      phoneNumber,
      "Você precisa configurar seu orçamento primeiro no app.\n\n" +
        "Acesse hivebudget.com.br e complete a configuração."
    );
    return;
  }

  const userContext = buildUserContext(userId, budgetInfo);

  try {
    const aiResponse = await parseUserMessage(text, userContext);

    await routeIntent(adapter, phoneNumber, aiResponse, userContext, text, []);
  } catch (error) {
    logger.error("AI processing error:", error);
    await adapter.sendMessage(
      phoneNumber,
      "Desculpe, tive um problema ao processar sua mensagem. Tente novamente."
    );
  }
}

// ============================================
// Confirmation Handlers
// ============================================

async function handleExpenseConfirmation(
  phoneNumber: string,
  confirmed: boolean
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  // Delete intermediate messages (no-op on WhatsApp, but keeps pattern consistent)
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await adapter.updateState(phoneNumber, "IDLE", {});
    await adapter.sendMessage(phoneNumber, "Registro cancelado.");
    return;
  }

  if (!context.pendingExpense?.categoryId) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro: dados incompletos. Tente novamente."
    );
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao salvar. Configure seu orçamento no app."
    );
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  let transactionId: string;

  // Check if we should update an existing scheduled transaction
  if (context.scheduledTransactionId) {
    await markTransactionAsPaid(
      context.scheduledTransactionId,
      context.pendingExpense.amount,
      context.pendingExpense.description,
      "whatsapp"
    );
    transactionId = context.scheduledTransactionId;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    await adapter.sendMessage(
      phoneNumber,
      `*Despesa confirmada!*\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.description
          ? `Descrição: ${context.pendingExpense.description}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
    return;
  }

  // Create new transaction
  const capitalizedDescription = capitalizeFirst(
    context.pendingExpense.description
  );
  const transactionAccountId =
    context.pendingExpense.accountId || budgetInfo.defaultAccount.id;

  // Handle installments
  if (
    context.pendingExpense.isInstallment &&
    context.pendingExpense.totalInstallments &&
    context.pendingExpense.totalInstallments > 1
  ) {
    const totalInstallments = context.pendingExpense.totalInstallments;
    const installmentAmount = Math.round(
      context.pendingExpense.amount / totalInstallments
    );
    const transactionDate = getTodayNoonUTC();

    // Check if account is a credit card with billing cycle
    const account = budgetInfo.accounts.find(
      (a) => a.id === transactionAccountId
    );
    const closingDay =
      account?.type === "credit_card" ? account.closingDay : null;

    // Calculate installment dates using billing cycle if available
    let installmentDates: Date[];
    if (closingDay) {
      const firstDate = getFirstInstallmentDate(transactionDate, closingDay);
      installmentDates = calculateInstallmentDates(
        firstDate,
        totalInstallments
      );
    } else {
      installmentDates = Array.from(
        { length: totalInstallments },
        (_, i) => {
          const d = new Date(transactionDate);
          d.setMonth(d.getMonth() + i);
          return d;
        }
      );
    }

    // Create parent transaction (first installment)
    const [parentTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: context.pendingExpense.categoryId,
        memberId: budgetInfo.member.id,
        type: "expense",
        status: "cleared",
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[0],
        isInstallment: true,
        installmentNumber: 1,
        totalInstallments,
        source: "whatsapp",
      })
      .returning();

    // Batch insert remaining installments
    const installmentValues = Array.from(
      { length: totalInstallments - 1 },
      (_, i) => ({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: context.pendingExpense!.categoryId,
        memberId: budgetInfo.member.id,
        type: "expense" as const,
        status: "cleared" as const,
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "whatsapp" as const,
      })
    );

    if (installmentValues.length > 0) {
      await db.insert(transactions).values(installmentValues);
    }

    transactionId = parentTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    await adapter.sendMessage(
      phoneNumber,
      `*Compra parcelada registrada!*\n\n` +
        `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  } else {
    // Non-installment transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: context.pendingExpense.categoryId,
        memberId: budgetInfo.member.id,
        type: "expense",
        status: "cleared",
        amount: context.pendingExpense.amount,
        description: capitalizedDescription,
        date: getTodayNoonUTC(),
        source: "whatsapp",
      })
      .returning();

    transactionId = newTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    await adapter.sendMessage(
      phoneNumber,
      `*Gasto registrado!*\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  }
}

async function handleIncomeConfirmation(
  phoneNumber: string,
  confirmed: boolean
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingIncome) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await adapter.updateState(phoneNumber, "IDLE", {});
    await adapter.sendMessage(phoneNumber, "Registro cancelado.");
    return;
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao salvar. Configure seu orçamento no app."
    );
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  let transactionId: string;

  // Check if we should update an existing scheduled transaction
  if (context.scheduledTransactionId) {
    await markTransactionAsPaid(
      context.scheduledTransactionId,
      context.pendingIncome.amount,
      context.pendingIncome.description || context.pendingIncome.incomeSourceName,
      "whatsapp"
    );
    transactionId = context.scheduledTransactionId;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    await adapter.sendMessage(
      phoneNumber,
      `*Receita confirmada!*\n\n` +
        (context.pendingIncome.incomeSourceName
          ? `Fonte: ${context.pendingIncome.incomeSourceName}\n`
          : "") +
        `Valor: ${formatCurrency(context.pendingIncome.amount)}\n` +
        (context.pendingIncome.description
          ? `Descrição: ${context.pendingIncome.description}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  } else {
    // Create new income transaction
    const capitalizedDescription = capitalizeFirst(
      context.pendingIncome.description
    );
    const incomeAccountId =
      context.pendingIncome.accountId || budgetInfo.defaultAccount.id;

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: incomeAccountId,
        incomeSourceId: context.pendingIncome.incomeSourceId,
        memberId: budgetInfo.member.id,
        type: "income",
        status: "cleared",
        amount: context.pendingIncome.amount,
        description:
          capitalizedDescription || context.pendingIncome.incomeSourceName,
        date: getTodayNoonUTC(),
        source: "whatsapp",
      })
      .returning();

    transactionId = newTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    await adapter.sendMessage(
      phoneNumber,
      `*Receita registrada!*\n\n` +
        (context.pendingIncome.incomeSourceName
          ? `Fonte: ${context.pendingIncome.incomeSourceName}\n`
          : "") +
        `Valor: ${formatCurrency(context.pendingIncome.amount)}\n` +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  }
}

async function handleTransferConfirmation(
  phoneNumber: string,
  confirmed: boolean
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (
    !context.pendingTransfer ||
    !context.pendingTransfer.fromAccountId ||
    !context.pendingTransfer.toAccountId
  ) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await adapter.updateState(phoneNumber, "IDLE", {});
    await adapter.sendMessage(phoneNumber, "Transferência cancelada.");
    return;
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);

  if (!budgetInfo) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao salvar. Configure seu orçamento no app."
    );
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Create transfer transaction
  const [newTransaction] = await db
    .insert(transactions)
    .values({
      budgetId: budgetInfo.budget.id,
      accountId: context.pendingTransfer.fromAccountId,
      toAccountId: context.pendingTransfer.toAccountId,
      memberId: budgetInfo.member.id,
      type: "transfer",
      status: "cleared",
      amount: context.pendingTransfer.amount,
      description:
        context.pendingTransfer.description || "Transferência via WhatsApp",
      date: getTodayNoonUTC(),
      source: "whatsapp",
    })
    .returning();

  // Update account balances: subtract from source, add to destination
  await db
    .update(financialAccounts)
    .set({ balance: sql`${financialAccounts.balance} - ${context.pendingTransfer.amount}` })
    .where(eq(financialAccounts.id, context.pendingTransfer.fromAccountId));

  await db
    .update(financialAccounts)
    .set({ balance: sql`${financialAccounts.balance} + ${context.pendingTransfer.amount}` })
    .where(eq(financialAccounts.id, context.pendingTransfer.toAccountId));

  if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

  await adapter.updateState(phoneNumber, "IDLE", {
    lastTransactionId: newTransaction.id,
  });

  // Get account names
  const fromAccount = budgetInfo.accounts.find(
    (a) => a.id === context.pendingTransfer?.fromAccountId
  );
  const toAccount = budgetInfo.accounts.find(
    (a) => a.id === context.pendingTransfer?.toAccountId
  );

  await adapter.sendMessage(
    phoneNumber,
    `*Transferência realizada!*\n\n` +
      `De: ${fromAccount?.name || "Conta"}\n` +
      `Para: ${toAccount?.name || "Conta"}\n` +
      `Valor: ${formatCurrency(context.pendingTransfer.amount)}\n\n` +
      `Envie *desfazer* para reverter.`
  );
}

// ============================================
// Category Selection Handler
// ============================================

async function handleCategorySelection(
  phoneNumber: string,
  categoryId: string
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingExpense) {
    await adapter.sendMessage(phoneNumber, "Erro: nenhum gasto pendente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Get category info
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!category) {
    await adapter.sendMessage(phoneNumber, "Categoria não encontrada.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Build confirmation message
  let message = `*Confirmar registro?*\n\n`;
  message += `${category.icon || ""} ${category.name}\n`;

  if (
    context.pendingExpense.isInstallment &&
    context.pendingExpense.totalInstallments &&
    context.pendingExpense.totalInstallments > 1
  ) {
    const installmentAmount = Math.round(
      context.pendingExpense.amount / context.pendingExpense.totalInstallments
    );
    message += `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n`;
    message += `Parcelas: ${context.pendingExpense.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
  } else {
    message += `Valor: ${formatCurrency(context.pendingExpense.amount)}\n`;
  }

  if (context.pendingExpense.accountName) {
    message += `Conta: ${context.pendingExpense.accountName}\n`;
  }
  if (context.pendingExpense.description) {
    message += `Descrição: ${context.pendingExpense.description}\n`;
  }

  const confirmMsgId = await adapter.sendConfirmation(phoneNumber, message);

  await adapter.updateState(phoneNumber, "AWAITING_CONFIRMATION", {
    pendingExpense: {
      ...context.pendingExpense,
      categoryId,
      categoryName: category.name,
    },
    messagesToDelete: [...(context.messagesToDelete || []), confirmMsgId],
    lastAILogId: context.lastAILogId,
  });
}

// ============================================
// Account Selection Handler
// ============================================

async function handleAccountSelection(
  phoneNumber: string,
  accountId: string
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingExpense) {
    await adapter.sendMessage(phoneNumber, "Erro: nenhum gasto pendente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Get account info
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, accountId));

  if (!account) {
    await adapter.sendMessage(phoneNumber, "Conta não encontrada.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Get budget info to show categories
  const budgetInfo = await getUserBudgetInfo(waUser.userId);

  if (!budgetInfo) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao carregar informações. Tente novamente."
    );
    return;
  }

  // Build value text
  let valueText = `Valor: ${formatCurrency(context.pendingExpense.amount)}\n`;
  if (
    context.pendingExpense.isInstallment &&
    context.pendingExpense.totalInstallments &&
    context.pendingExpense.totalInstallments > 1
  ) {
    const installmentAmount = Math.round(
      context.pendingExpense.amount / context.pendingExpense.totalInstallments
    );
    valueText =
      `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
      `Parcelas: ${context.pendingExpense.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
  }

  // Now ask for category
  const catSelectMsgId = await adapter.sendChoiceList(
    phoneNumber,
    `*Registrar gasto*\n\n` +
      valueText +
      `Conta: ${account.name}\n` +
      (context.pendingExpense.description
        ? `Descrição: ${context.pendingExpense.description}\n\n`
        : "\n") +
      `Selecione a categoria:`,
    budgetInfo.categories.map((c) => ({
      id: `cat_${c.id}`,
      label: `${c.icon || ""} ${c.name}`,
    }))
  );

  await adapter.updateState(phoneNumber, "AWAITING_CATEGORY", {
    pendingExpense: {
      ...context.pendingExpense,
      accountId: account.id,
      accountName: account.name,
    },
    messagesToDelete: [
      ...(context.messagesToDelete || []),
      catSelectMsgId,
    ],
    lastAILogId: context.lastAILogId,
  });
}

// ============================================
// New Category Handlers
// ============================================

async function handleNewCategoryAccept(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;
  const suggestedName =
    context.pendingNewCategory?.suggestedName || "Nova Categoria";

  // Get all groups from database
  const allGroups = await db.select().from(groups);

  const groupMsgId = await adapter.sendGroupList(
    phoneNumber,
    `*Criar categoria "${suggestedName}"*\n\nSelecione o grupo para esta categoria:`,
    allGroups.map((g) => ({ id: g.id, label: `${g.icon || ""} ${g.name}` }))
  );

  await adapter.updateState(phoneNumber, "AWAITING_NEW_CATEGORY_GROUP", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), groupMsgId],
  });
}

async function handleNewCategoryRename(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  await adapter.sendMessage(
    phoneNumber,
    `*Digite o nome da nova categoria:*\n\nExemplo: "Mercado", "Transporte", "Lazer"`
  );

  await adapter.updateState(phoneNumber, "AWAITING_NEW_CATEGORY_NAME", {
    ...context,
  });
}

async function handleNewCategoryExisting(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const budgetInfo = await getUserBudgetInfo(waUser.userId);
  if (!budgetInfo) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao carregar informações. Tente novamente."
    );
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  const catMsgId = await adapter.sendChoiceList(
    phoneNumber,
    `*Selecione uma categoria existente:*`,
    budgetInfo.categories.map((c) => ({
      id: `cat_${c.id}`,
      label: `${c.icon || ""} ${c.name}`,
    }))
  );

  await adapter.updateState(phoneNumber, "AWAITING_CATEGORY", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), catMsgId],
  });
}

async function handleCustomCategoryName(
  phoneNumber: string,
  text: string
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingNewCategory) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos. Tente novamente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Get groups
  const allGroups = await db.select().from(groups);

  const groupMsgId = await adapter.sendGroupList(
    phoneNumber,
    `*Criar categoria "${text.trim()}"*\n\nSelecione o grupo para esta categoria:`,
    allGroups.map((g) => ({ id: g.id, label: `${g.icon || ""} ${g.name}` }))
  );

  await adapter.updateState(phoneNumber, "AWAITING_NEW_CATEGORY_GROUP", {
    ...context,
    pendingNewCategory: {
      ...context.pendingNewCategory,
      customName: text.trim(),
    },
    messagesToDelete: [...(context.messagesToDelete || []), groupMsgId],
  });
}

async function handleGroupSelection(
  phoneNumber: string,
  groupId: string
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  if (!context.pendingNewCategory || !context.pendingExpense) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos. Tente novamente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);
  if (!budgetInfo) {
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao carregar informações. Tente novamente."
    );
    return;
  }

  const categoryName =
    context.pendingNewCategory.customName ||
    context.pendingNewCategory.suggestedName;

  // Create the new category
  const [newCategory] = await db
    .insert(categories)
    .values({
      budgetId: budgetInfo.budget.id,
      groupId,
      name: categoryName,
      icon: "",
      isArchived: false,
    })
    .returning();

  // Now create the transaction with the new category
  const capitalizedDescription = capitalizeFirst(
    context.pendingExpense.description
  );
  const transactionAccountId =
    context.pendingExpense.accountId || budgetInfo.defaultAccount!.id;

  let transactionId: string;

  // Handle installments
  if (
    context.pendingExpense.isInstallment &&
    context.pendingExpense.totalInstallments &&
    context.pendingExpense.totalInstallments > 1
  ) {
    const totalInstallments = context.pendingExpense.totalInstallments;
    const installmentAmount = Math.round(
      context.pendingExpense.amount / totalInstallments
    );
    const transactionDate = getTodayNoonUTC();

    // Check if account is a credit card with billing cycle
    const account = budgetInfo.accounts.find(
      (a) => a.id === transactionAccountId
    );
    const closingDay =
      account?.type === "credit_card" ? account.closingDay : null;

    let installmentDates: Date[];
    if (closingDay) {
      const firstDate = getFirstInstallmentDate(transactionDate, closingDay);
      installmentDates = calculateInstallmentDates(
        firstDate,
        totalInstallments
      );
    } else {
      installmentDates = Array.from(
        { length: totalInstallments },
        (_, i) => {
          const d = new Date(transactionDate);
          d.setMonth(d.getMonth() + i);
          return d;
        }
      );
    }

    // Create parent transaction (first installment)
    const [parentTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: newCategory.id,
        memberId: budgetInfo.member.id,
        type: "expense",
        status: "cleared",
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[0],
        isInstallment: true,
        installmentNumber: 1,
        totalInstallments,
        source: "whatsapp",
      })
      .returning();

    // Batch insert remaining installments
    const installmentValues = Array.from(
      { length: totalInstallments - 1 },
      (_, i) => ({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: newCategory.id,
        memberId: budgetInfo.member.id,
        type: "expense" as const,
        status: "cleared" as const,
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "whatsapp" as const,
      })
    );

    if (installmentValues.length > 0) {
      await db.insert(transactions).values(installmentValues);
    }

    transactionId = parentTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    // Get group name
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    await adapter.sendMessage(
      phoneNumber,
      `*Categoria criada e compra parcelada registrada!*\n\n` +
        `Nova categoria: *${categoryName}*\n` +
        `Grupo: ${group?.name || "---"}\n\n` +
        `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)}\n` +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  } else {
    // Non-installment transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: newCategory.id,
        memberId: budgetInfo.member.id,
        type: "expense",
        status: "cleared",
        amount: context.pendingExpense.amount,
        description: capitalizedDescription,
        date: getTodayNoonUTC(),
        source: "whatsapp",
      })
      .returning();

    transactionId = newTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    // Get group name
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    await adapter.sendMessage(
      phoneNumber,
      `*Categoria criada e gasto registrado!*\n\n` +
        `Nova categoria: *${categoryName}*\n` +
        `Grupo: ${group?.name || "---"}\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
  }
}

// ============================================
// Interactive Response Handler (Button/List replies)
// ============================================

async function handleInteractiveResponse(
  phoneNumber: string,
  actionId: string,
  messageId: string
): Promise<void> {
  // Acknowledge the interaction (mark as read)
  try {
    await adapter.acknowledgeInteraction(messageId);
  } catch {
    // Non-critical, continue processing
  }

  // Get current user state
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(
      phoneNumber,
      "Você precisa conectar sua conta primeiro."
    );
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;
  const currentStep = waUser.currentStep as ConversationStep;

  // Handle cancel from any state
  if (actionId === "cancel") {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);

    // Delete intermediate messages
    if (context.messagesToDelete && context.messagesToDelete.length > 0) {
      await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
    }

    await adapter.updateState(phoneNumber, "IDLE", {});
    await adapter.sendMessage(phoneNumber, "Operação cancelada.");
    return;
  }

  // Route based on action ID prefix and current step
  if (actionId.startsWith("cat_")) {
    const categoryId = actionId.replace("cat_", "");
    await handleCategorySelection(phoneNumber, categoryId);
    return;
  }

  if (actionId.startsWith("acc_")) {
    const accountId = actionId.replace("acc_", "");
    await handleAccountSelection(phoneNumber, accountId);
    return;
  }

  if (actionId.startsWith("group_")) {
    const groupId = actionId.replace("group_", "");
    await handleGroupSelection(phoneNumber, groupId);
    return;
  }

  if (actionId === "newcat_accept") {
    await handleNewCategoryAccept(phoneNumber);
    return;
  }

  if (actionId === "newcat_rename") {
    await handleNewCategoryRename(phoneNumber);
    return;
  }

  if (actionId === "newcat_existing") {
    await handleNewCategoryExisting(phoneNumber);
    return;
  }

  if (actionId === "confirm") {
    // Determine what to confirm based on context
    if (context.pendingIncome) {
      await handleIncomeConfirmation(phoneNumber, true);
    } else if (context.pendingTransfer) {
      await handleTransferConfirmation(phoneNumber, true);
    } else {
      await handleExpenseConfirmation(phoneNumber, true);
    }
    return;
  }

  // Unknown action
  logger.warn("Unknown interactive action:", { actionId, currentStep });
  await adapter.sendMessage(phoneNumber, "Ação não reconhecida. Tente novamente.");
}

// ============================================
// Text Message Handler
// ============================================

async function handleTextMessage(
  phoneNumber: string,
  text: string,
  displayName?: string
): Promise<void> {
  logger.info("handleTextMessage", { phoneNumber, text: text.slice(0, 50), displayName });
  const waUser = await getOrCreateWhatsAppUser(phoneNumber, displayName);
  logger.info("WhatsApp user state", { userId: waUser.userId, step: waUser.currentStep });

  // If user is not connected
  if (!waUser.userId) {
    // Check if text looks like a verification code
    if (isVerificationCode(text)) {
      const wasValidCode = await handleVerificationCode(phoneNumber, text);
      if (wasValidCode) {
        return;
      }
      // Code was invalid/expired - fall through to show connection instructions
    }

    await adapter.sendMessage(
      phoneNumber,
      `Olá! Para usar o HiveBudget pelo WhatsApp, você precisa conectar sua conta.\n\n` +
        `*Como conectar:*\n` +
        `1. Acesse hivebudget.com.br\n` +
        `2. Vá em Configurações > Conectar WhatsApp\n` +
        `3. Copie o código de 6 caracteres\n` +
        `4. Envie o código aqui neste chat\n\n` +
        `Aguardando seu código...`
    );
    return;
  }

  // User is connected - check for commands
  const command = isCommand(text);
  if (command) {
    switch (command) {
      case "ajuda":
        await handleHelp(phoneNumber);
        return;
      case "cancelar":
        await handleCancel(phoneNumber);
        return;
      case "desfazer":
        await handleUndo(phoneNumber);
        return;
      case "start":
        await handleHelp(phoneNumber);
        return;
    }
  }

  // Handle based on current conversation step
  const currentStep = waUser.currentStep as ConversationStep;

  switch (currentStep) {
    case "AWAITING_NEW_CATEGORY_NAME":
      await handleCustomCategoryName(phoneNumber, text);
      break;

    case "AWAITING_ACCOUNT":
    case "AWAITING_CATEGORY":
    case "AWAITING_CONFIRMATION":
    case "AWAITING_NEW_CATEGORY_CONFIRM":
    case "AWAITING_NEW_CATEGORY_GROUP":
    case "AWAITING_INCOME_SOURCE":
    case "AWAITING_TRANSFER_DEST": {
      // User is in the middle of a flow but sent text instead of using buttons
      // Cancel the previous AI log before resetting
      const prevContext = (waUser.context || {}) as ConversationContext;
      if (prevContext.lastAILogId) {
        await markLogAsCancelled(prevContext.lastAILogId);
      }
      // Reset and process as new message
      await adapter.updateState(phoneNumber, "IDLE", {});
      await handleAIMessage(phoneNumber, text, waUser.userId);
      break;
    }

    case "IDLE":
    default:
      // Process with AI
      await handleAIMessage(phoneNumber, text, waUser.userId);
      break;
  }
}

// ============================================
// Top-Level Webhook Handler
// ============================================

export async function handleWebhook(
  payload: WhatsAppWebhookPayload
): Promise<void> {
  if (payload.object !== "whatsapp_business_account") {
    logger.warn("Unexpected webhook object:", payload.object);
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        // This might be a status update (delivery receipt, etc.)
        continue;
      }

      // Get contact info for display name
      const contacts = value.contacts;
      const contactMap = new Map<string, string>();
      if (contacts) {
        for (const contact of contacts) {
          contactMap.set(contact.wa_id, contact.profile.name);
        }
      }

      for (const message of messages) {
        const phoneNumber = message.from;
        const displayName = contactMap.get(message.from);

        try {
          switch (message.type) {
            case "text":
              if (message.text?.body) {
                await handleTextMessage(
                  phoneNumber,
                  message.text.body.trim(),
                  displayName
                );
              }
              break;

            case "interactive":
              if (message.interactive) {
                const actionId =
                  message.interactive.button_reply?.id ||
                  message.interactive.list_reply?.id;

                if (actionId) {
                  await handleInteractiveResponse(
                    phoneNumber,
                    actionId,
                    message.id
                  );
                }
              }
              break;

            case "audio":
              // Mark as read
              try {
                await adapter.acknowledgeInteraction(message.id);
              } catch {
                // Non-critical
              }

              // Check if user is connected
              {
                const waUser = await getOrCreateWhatsAppUser(phoneNumber, displayName);
                if (!waUser.userId) {
                  await adapter.sendMessage(
                    phoneNumber,
                    "Você precisa conectar sua conta primeiro para enviar áudios."
                  );
                  break;
                }

                if (message.audio?.id) {
                  const { transcription } =
                    await handleVoiceMessage(
                      adapter,
                      phoneNumber,
                      message.audio.id,
                      message.audio.mime_type
                    );

                  if (transcription) {
                    await handleAIMessage(phoneNumber, transcription, waUser.userId);
                  }
                }
              }
              break;

            case "image":
            case "video":
            case "document":
            case "sticker":
            case "location":
            case "contacts":
              // Mark as read
              try {
                await adapter.acknowledgeInteraction(message.id);
              } catch {
                // Non-critical
              }
              await adapter.sendMessage(
                phoneNumber,
                "Este tipo de mensagem ainda não é suportado. " +
                  "Por favor, envie uma mensagem de texto."
              );
              break;

            case "reaction":
              // Reactions don't need a response
              break;

            default:
              logger.warn("Unhandled message type:", { type: message.type });
              break;
          }
        } catch (error) {
          logger.error("Error processing WhatsApp message:", {
            phoneNumber,
            messageType: message.type,
            error,
          });

          try {
            await adapter.sendMessage(
              phoneNumber,
              "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente."
            );
          } catch {
            // Best-effort error notification
          }
        }
      }
    }
  }
}
