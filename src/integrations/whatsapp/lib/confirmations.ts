import { db } from "@/db";
import {
  whatsappUsers,
  transactions,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
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
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { getScopeFromCategory, getScopeFromIncomeSource } from "@/shared/lib/transactions/scope";
import {
  distributeInstallmentAmounts,
  createInstallmentTransactions,
  applyTransactionBalanceChange,
} from "@/shared/lib/transactions/installments";
import { formatCurrency } from "@/shared/lib/formatters";
import { formatAccountDisplay, formatAccountWithIcon } from "@/integrations/messaging/lib/ai-handlers/account-utils";
import {
  validateExpenseInputs,
  validateIncomeInputs,
  validateTransferInputs,
} from "@/integrations/messaging/lib/budget-validation";

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

  // Conversation context can be tampered with (or stale across budget changes).
  // Re-check that the chosen category and account still belong to the user's
  // budget before persisting anything.
  const expenseCheck = validateExpenseInputs(budgetInfo, {
    categoryId: context.pendingExpense.categoryId,
    accountId: context.pendingExpense.accountId,
  });
  if (!expenseCheck.ok) {
    await adapter.sendMessage(phoneNumber, expenseCheck.error!);
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
        (context.pendingExpense.accountName
          ? `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`
          : "") +
        (context.pendingExpense.description
          ? `Descrição: ${context.pendingExpense.description}\n\n`
          : "\n") +
        `Envie *desfazer* para remover.`
    );
    return;
  }

  // Before creating new: try to find and confirm existing pending transaction
  // (e.g., lazy-generated from recurring bill that wasn't in the scheduled list at match time)
  if (context.pendingExpense.description) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [existingPending] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetInfo.budget.id),
          eq(transactions.type, "expense"),
          eq(transactions.status, "pending"),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd),
          eq(transactions.amount, context.pendingExpense.amount),
          ...(context.pendingExpense.categoryId
            ? [eq(transactions.categoryId, context.pendingExpense.categoryId)]
            : [])
        )
      )
      .limit(1);

    if (existingPending) {
      await markTransactionAsPaid(
        existingPending.id,
        context.pendingExpense.amount,
        context.pendingExpense.description,
        "whatsapp"
      );
      transactionId = existingPending.id;

      if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

      await adapter.updateState(phoneNumber, "IDLE", {
        lastTransactionId: transactionId,
      });

      await adapter.sendMessage(
        phoneNumber,
        `*Despesa confirmada!*\n\n` +
          `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
          `Categoria: ${context.pendingExpense.categoryName}\n` +
          `Descrição: ${capitalizeFirst(context.pendingExpense.description)}\n\n` +
          `Envie *desfazer* para remover.`
      );
      return;
    }
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
    const installmentAmounts = distributeInstallmentAmounts(
      context.pendingExpense.amount,
      totalInstallments
    );
    const transactionDate = getTodayNoonUTC();

    // Derive scope from the category
    const scopeMemberId = getScopeFromCategory(
      context.pendingExpense.categoryId,
      budgetInfo.categories,
      budgetInfo.member.id,
    );

    const accountType = budgetInfo.accounts.find(a => a.id === transactionAccountId)?.type
      ?? budgetInfo.defaultAccount.type;

    const [parentTransaction] = await db.transaction(async (tx) =>
      createInstallmentTransactions({
        tx,
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        accountType,
        categoryId: context.pendingExpense!.categoryId,
        memberId: scopeMemberId,
        paidByMemberId: budgetInfo.member.id,
        type: "expense",
        totalAmount: context.pendingExpense!.amount,
        totalInstallments,
        description: capitalizedDescription,
        firstDate: transactionDate,
        source: "whatsapp",
        status: "cleared",
      })
    );

    transactionId = parentTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    const installmentBalanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      context.pendingExpense!.categoryId!,
      context.pendingExpense!.categoryName
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Compra parcelada registrada!*\n\n` +
        `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmounts[0])} ${formatInstallmentMonths(totalInstallments)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.accountName
          ? `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n`
          : "") +
        `\n${installmentBalanceLine}\n\n` +
        `Envie *desfazer* para remover.`
    );
  } else {
    // Derive scope from the category
    const nonInstallScopeMemberId = getScopeFromCategory(
      context.pendingExpense.categoryId,
      budgetInfo.categories,
      budgetInfo.member.id,
    );

    // Non-installment transaction
    const newTransaction = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transactions)
        .values({
          budgetId: budgetInfo.budget.id,
          accountId: transactionAccountId,
          categoryId: context.pendingExpense!.categoryId,
          memberId: nonInstallScopeMemberId,
          paidByMemberId: budgetInfo.member.id,
          type: "expense",
          status: "cleared",
          amount: context.pendingExpense!.amount,
          description: capitalizedDescription,
          date: getTodayNoonUTC(),
          source: "whatsapp",
        })
        .returning();

      await applyTransactionBalanceChange(tx, {
        accountId: created.accountId,
        type: "expense",
        amount: created.amount,
        status: created.status,
      });

      return created;
    });

    transactionId = newTransaction.id;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await adapter.updateState(phoneNumber, "IDLE", {
      lastTransactionId: transactionId,
    });

    const balanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      context.pendingExpense!.categoryId!,
      context.pendingExpense!.categoryName
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Gasto registrado!*\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.accountName
          ? `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`
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

  const incomeCheck = validateIncomeInputs(budgetInfo, {
    incomeSourceId: context.pendingIncome.incomeSourceId,
    accountId: context.pendingIncome.accountId,
  });
  if (!incomeCheck.ok) {
    await adapter.sendMessage(phoneNumber, incomeCheck.error!);
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

    const incomeScopeMemberId = getScopeFromIncomeSource(
      context.pendingIncome.incomeSourceId,
      budgetInfo.incomeSources || [],
      budgetInfo.member.id,
    );

    const newTransaction = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transactions)
        .values({
          budgetId: budgetInfo.budget.id,
          accountId: incomeAccountId,
          incomeSourceId: context.pendingIncome!.incomeSourceId,
          memberId: incomeScopeMemberId,
          paidByMemberId: budgetInfo.member.id,
          type: "income",
          status: "cleared",
          amount: context.pendingIncome!.amount,
          description:
            capitalizedDescription || context.pendingIncome!.incomeSourceName,
          date: getTodayNoonUTC(),
          source: "whatsapp",
        })
        .returning();

      await applyTransactionBalanceChange(tx, {
        accountId: created.accountId,
        type: "income",
        amount: created.amount,
        status: created.status,
      });

      return created;
    });

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

  const transferCheck = validateTransferInputs(budgetInfo, {
    fromAccountId: context.pendingTransfer.fromAccountId,
    toAccountId: context.pendingTransfer.toAccountId,
  });
  if (!transferCheck.ok) {
    await adapter.sendMessage(phoneNumber, transferCheck.error!);
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Create transfer transaction and update balances atomically.
  // applyTransactionBalanceChange mirrors clearedBalance because status="cleared".
  const [newTransaction] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: context.pendingTransfer!.fromAccountId!,
        toAccountId: context.pendingTransfer!.toAccountId!,
        memberId: budgetInfo.member.id,
        paidByMemberId: budgetInfo.member.id,
        type: "transfer",
        status: "cleared",
        amount: context.pendingTransfer!.amount,
        description:
          context.pendingTransfer!.description || "Transferência via WhatsApp",
        date: getTodayNoonUTC(),
        source: "whatsapp",
      })
      .returning();

    await applyTransactionBalanceChange(tx, {
      accountId: created.accountId,
      type: "transfer",
      amount: created.amount,
      toAccountId: created.toAccountId,
      status: created.status,
    });

    return [created];
  });

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
      `De: ${fromAccount ? formatAccountWithIcon(fromAccount.name, fromAccount.type) : "Conta"}\n` +
      `Para: ${toAccount ? formatAccountWithIcon(toAccount.name, toAccount.type) : "Conta"}\n` +
      `Valor: ${formatCurrency(context.pendingTransfer.amount)}\n\n` +
      `Envie *desfazer* para reverter.`
  );
}
