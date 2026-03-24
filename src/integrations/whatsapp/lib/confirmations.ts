import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  whatsappUsers,
  transactions,
  financialAccounts,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ConversationContext } from "@/integrations/messaging/lib/types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import {
  getUserBudgetInfo,
  getCategoryBalanceSummary,
} from "@/integrations/messaging/lib/user-context";
import {
  markLogAsConfirmed,
  markLogAsCancelled,
} from "@/integrations/messaging/lib/ai-logger";
import { markTransactionAsPaid } from "@/integrations/messaging/lib/transaction-matcher";
import { getTodayNoonUTC, formatInstallmentMonths } from "@/integrations/messaging/lib/utils";
import {
  getFirstInstallmentDate,
  calculateInstallmentDates,
} from "@/shared/lib/billing-cycle";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { formatCurrency } from "@/shared/lib/formatters";

const logger = createLogger("whatsapp:confirmations");
const adapter = new WhatsAppAdapter();

export async function handleExpenseConfirmation(
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
        (context.pendingExpense.paymentMethodLabel
          ? `Pagamento: ${context.pendingExpense.paymentMethodLabel}\n`
          : "") +
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

    const installmentBalanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      context.pendingExpense!.categoryId!
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Compra parcelada registrada!*\n\n` +
        `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)} ${formatInstallmentMonths(totalInstallments)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.paymentMethodLabel
          ? `Pagamento: ${context.pendingExpense.paymentMethodLabel}\n`
          : "") +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n`
          : "") +
        `\n${installmentBalanceLine}\n\n` +
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

    const balanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      context.pendingExpense!.categoryId!
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Gasto registrado!*\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.paymentMethodLabel
          ? `Pagamento: ${context.pendingExpense.paymentMethodLabel}\n`
          : "") +
        (context.pendingExpense.accountName
          ? `Conta: ${context.pendingExpense.accountName}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n`
          : "") +
        `\n${balanceLine}\n\n` +
        `Envie *desfazer* para remover.`
    );
  }
}

export async function handleIncomeConfirmation(
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

export async function handleTransferConfirmation(
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
