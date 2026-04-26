import { db } from "@/db";
import {
  telegramUsers,
  transactions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TelegramConversationContext } from "@/db/schema/telegram-users";
import { getUserBudgetInfo, getCategoryBalanceSummary } from "@/integrations/messaging/lib/user-context";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import {
  sendMessage,
  answerCallbackQuery,
  formatCurrency,
  deleteMessages,
} from "./bot";
import { markTransactionAsPaid } from "./transaction-matcher";
import { getTodayNoonUTC } from "./telegram-utils";
import { formatInstallmentMonths } from "@/integrations/messaging/lib/utils";
import { markLogAsConfirmed, markLogAsCancelled } from "./ai-logger";
import { getScopeFromCategory, getScopeFromIncomeSource } from "@/shared/lib/transactions/scope";
import {
  distributeInstallmentAmounts,
  createInstallmentTransactions,
  applyTransactionBalanceChange,
} from "@/shared/lib/transactions/installments";
import { updateTelegramUser } from "./user-management";
import {
  validateExpenseInputs,
  validateIncomeInputs,
  validateTransferInputs,
} from "@/integrations/messaging/lib/budget-validation";

// Handle confirmation callback
export async function handleConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  const context = telegramUser.context as TelegramConversationContext;

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await deleteMessages(chatId, context.messagesToDelete);
  }

  // Handle cancel first - no need to validate data
  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await updateTelegramUser(chatId, "IDLE", {});
    await sendMessage(chatId, "Registro cancelado.");
    return;
  }

  // Only validate data if confirming
  if (!context.pendingExpense?.categoryId) {
    await sendMessage(chatId, "Erro: dados incompletos. Tente novamente.");
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  // Get budget info for the transaction
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await sendMessage(chatId, "❌ Erro ao salvar. Configure seu orçamento no app.");
    return;
  }

  // Re-validate FKs against the current budget snapshot before persisting.
  const expenseCheck = validateExpenseInputs(budgetInfo, {
    categoryId: context.pendingExpense.categoryId,
    accountId: context.pendingExpense.accountId,
  });
  if (!expenseCheck.ok) {
    await sendMessage(chatId, `❌ ${expenseCheck.error}`);
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  let transactionId: string;

  // Check if we should update an existing scheduled transaction
  if (context.scheduledTransactionId) {
    // Update existing scheduled transaction
    await markTransactionAsPaid(
      context.scheduledTransactionId,
      context.pendingExpense.amount,
      context.pendingExpense.description
    );
    transactionId = context.scheduledTransactionId;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    await sendMessage(
      chatId,
      `✅ <b>Despesa confirmada!</b>\n\n` +
        `Valor: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
        `Categoria: ${context.pendingExpense.categoryName}\n` +
        (context.pendingExpense.description ? `Descrição: ${context.pendingExpense.description}\n\n` : "\n") +
        `Use /desfazer para remover este registro.`
    );
  } else {
    // Create new transaction
    const capitalizedDescription = capitalizeFirst(context.pendingExpense.description);
    // Use account from context if specified, otherwise default
    const transactionAccountId = context.pendingExpense.accountId || budgetInfo.defaultAccount.id;

    // Handle installments
    if (context.pendingExpense.isInstallment && context.pendingExpense.totalInstallments && context.pendingExpense.totalInstallments > 1) {
      const totalInstallments = context.pendingExpense.totalInstallments;
      const installmentAmounts = distributeInstallmentAmounts(
        context.pendingExpense.amount,
        totalInstallments
      );
      const transactionDate = getTodayNoonUTC();

      // Derive scope from category
      const installmentScope = getScopeFromCategory(
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
          memberId: installmentScope,
          paidByMemberId: budgetInfo.member.id,
          type: "expense",
          totalAmount: context.pendingExpense!.amount,
          totalInstallments,
          description: capitalizedDescription,
          firstDate: transactionDate,
          source: "telegram",
          status: "cleared",
        })
      );

      transactionId = parentTransaction.id;

      if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

      // Update state with last transaction for undo
      await updateTelegramUser(chatId, "IDLE", {
        lastTransactionId: transactionId,
      });

      const tgInstallmentBalance = await getCategoryBalanceSummary(
        budgetInfo.budget.id,
        context.pendingExpense!.categoryId!
      );

      await sendMessage(
        chatId,
        `✅ <b>Compra parcelada registrada!</b>\n\n` +
          `Valor total: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
          `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmounts[0])} ${formatInstallmentMonths(totalInstallments)}\n` +
          `Categoria: ${context.pendingExpense.categoryName}\n` +
          (context.pendingExpense.accountName ? `Conta: ${context.pendingExpense.accountName}\n` : "") +
          (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n` : "") +
          `\n${tgInstallmentBalance}\n\n` +
          `Use /desfazer para remover este registro.`
      );
    } else {
      // Non-installment transaction
      const expenseScope = getScopeFromCategory(
        context.pendingExpense.categoryId,
        budgetInfo.categories,
        budgetInfo.member.id,
      );

      const newTransaction = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(transactions)
          .values({
            budgetId: budgetInfo.budget.id,
            accountId: transactionAccountId,
            categoryId: context.pendingExpense!.categoryId,
            memberId: expenseScope,
            paidByMemberId: budgetInfo.member.id,
            type: "expense",
            status: "cleared",
            amount: context.pendingExpense!.amount,
            description: capitalizedDescription,
            date: getTodayNoonUTC(),
            source: "telegram",
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

      // Update state with last transaction for undo
      await updateTelegramUser(chatId, "IDLE", {
        lastTransactionId: transactionId,
      });

      const tgBalance = await getCategoryBalanceSummary(
        budgetInfo.budget.id,
        context.pendingExpense!.categoryId!
      );

      await sendMessage(
        chatId,
        `✅ <b>Gasto registrado!</b>\n\n` +
          `Valor: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
          `Categoria: ${context.pendingExpense.categoryName}\n` +
          (context.pendingExpense.accountName ? `Conta: ${context.pendingExpense.accountName}\n` : "") +
          (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n` : "") +
          `\n${tgBalance}\n\n` +
          `Use /desfazer para remover este registro.`
      );
    }
  }
}

// Handle income confirmation
export async function handleIncomeConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingIncome) {
    await answerCallbackQuery(callbackQueryId, "Erro: dados incompletos.");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await deleteMessages(chatId, context.messagesToDelete);
  }

  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await updateTelegramUser(chatId, "IDLE", {});
    await sendMessage(chatId, "Registro cancelado.");
    return;
  }

  // Get budget info
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await sendMessage(chatId, "Erro ao salvar. Configure seu orçamento no app.");
    return;
  }

  const incomeCheck = validateIncomeInputs(budgetInfo, {
    incomeSourceId: context.pendingIncome.incomeSourceId,
    accountId: context.pendingIncome.accountId,
  });
  if (!incomeCheck.ok) {
    await sendMessage(chatId, `❌ ${incomeCheck.error}`);
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  let transactionId: string;

  // Check if we should update an existing scheduled transaction
  if (context.scheduledTransactionId) {
    // Update existing scheduled transaction
    await markTransactionAsPaid(
      context.scheduledTransactionId,
      context.pendingIncome.amount,
      context.pendingIncome.description || context.pendingIncome.incomeSourceName
    );
    transactionId = context.scheduledTransactionId;

    if (context.lastAILogId) await markLogAsConfirmed(context.lastAILogId);

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    await sendMessage(
      chatId,
      `<b>Receita confirmada!</b>\n\n` +
        (context.pendingIncome.incomeSourceName ? `Fonte: ${context.pendingIncome.incomeSourceName}\n` : "") +
        `Valor: ${formatCurrency(context.pendingIncome.amount)}\n` +
        (context.pendingIncome.description ? `Descrição: ${context.pendingIncome.description}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
  } else {
    // Create new income transaction
    const capitalizedDescription = capitalizeFirst(context.pendingIncome.description);

    // Use account from context if specified, otherwise default
    const incomeAccountId = context.pendingIncome.accountId || budgetInfo.defaultAccount.id;

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
          description: capitalizedDescription || context.pendingIncome!.incomeSourceName,
          date: getTodayNoonUTC(),
          source: "telegram",
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

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    await sendMessage(
      chatId,
      `<b>Receita registrada!</b>\n\n` +
        (context.pendingIncome.incomeSourceName ? `Fonte: ${context.pendingIncome.incomeSourceName}\n` : "") +
        `Valor: ${formatCurrency(context.pendingIncome.amount)}\n` +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
  }
}

// Handle transfer confirmation
export async function handleTransferConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingTransfer || !context.pendingTransfer.fromAccountId || !context.pendingTransfer.toAccountId) {
    await answerCallbackQuery(callbackQueryId, "Erro: dados incompletos.");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await deleteMessages(chatId, context.messagesToDelete);
  }

  if (!confirmed) {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
    await updateTelegramUser(chatId, "IDLE", {});
    await sendMessage(chatId, "Transferência cancelada.");
    return;
  }

  // Get budget info
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao salvar. Configure seu orçamento no app.");
    return;
  }

  const transferCheck = validateTransferInputs(budgetInfo, {
    fromAccountId: context.pendingTransfer.fromAccountId,
    toAccountId: context.pendingTransfer.toAccountId,
  });
  if (!transferCheck.ok) {
    await sendMessage(chatId, `❌ ${transferCheck.error}`);
    await updateTelegramUser(chatId, "IDLE", {});
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
        description: context.pendingTransfer!.description || "Transferência via Telegram",
        date: getTodayNoonUTC(),
        source: "telegram",
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

  await updateTelegramUser(chatId, "IDLE", {
    lastTransactionId: newTransaction.id,
  });

  // Get account names
  const fromAccount = budgetInfo.accounts.find((a) => a.id === context.pendingTransfer?.fromAccountId);
  const toAccount = budgetInfo.accounts.find((a) => a.id === context.pendingTransfer?.toAccountId);

  await sendMessage(
    chatId,
    `<b>Transferência realizada!</b>\n\n` +
      `De: ${fromAccount?.name || "Conta"}\n` +
      `Para: ${toAccount?.name || "Conta"}\n` +
      `Valor: ${formatCurrency(context.pendingTransfer.amount)}\n\n` +
      `Use /desfazer para reverter.`
  );
}
