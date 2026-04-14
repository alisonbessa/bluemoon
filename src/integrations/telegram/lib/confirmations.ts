import { db } from "@/db";
import {
  telegramUsers,
  transactions,
  financialAccounts,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
import { updateTelegramUser } from "./user-management";

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
      const installmentAmount = Math.round(context.pendingExpense.amount / totalInstallments);
      const transactionDate = getTodayNoonUTC();

      const installmentDates = Array.from({ length: totalInstallments }, (_, i) => {
        const d = new Date(transactionDate);
        d.setMonth(d.getMonth() + i);
        return d;
      });

      // Derive scope from category
      const installmentScope = getScopeFromCategory(
        context.pendingExpense.categoryId,
        budgetInfo.categories,
        budgetInfo.member.id,
      );

      // Create parent transaction (first installment)
      const [parentTransaction] = await db
        .insert(transactions)
        .values({
          budgetId: budgetInfo.budget.id,
          accountId: transactionAccountId,
          categoryId: context.pendingExpense.categoryId,
          memberId: installmentScope,
          paidByMemberId: budgetInfo.member.id,
          type: "expense",
          status: "cleared",
          amount: installmentAmount,
          description: capitalizedDescription,
          date: installmentDates[0],
          isInstallment: true,
          installmentNumber: 1,
          totalInstallments,
          source: "telegram",
        })
        .returning();

      // Batch insert remaining installments
      const installmentValues = Array.from({ length: totalInstallments - 1 }, (_, i) => ({
        budgetId: budgetInfo.budget.id,
        accountId: transactionAccountId,
        categoryId: context.pendingExpense!.categoryId,
        memberId: installmentScope,
        paidByMemberId: budgetInfo.member.id,
        type: "expense" as const,
        status: "cleared" as const,
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "telegram" as const,
      }));

      if (installmentValues.length > 0) {
        await db.insert(transactions).values(installmentValues);
      }

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
          `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)} ${formatInstallmentMonths(totalInstallments)}\n` +
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

      const [newTransaction] = await db
        .insert(transactions)
        .values({
          budgetId: budgetInfo.budget.id,
          accountId: transactionAccountId,
          categoryId: context.pendingExpense.categoryId,
          memberId: expenseScope,
          paidByMemberId: budgetInfo.member.id,
          type: "expense",
          status: "cleared",
          amount: context.pendingExpense.amount,
          description: capitalizedDescription,
          date: getTodayNoonUTC(),
          source: "telegram",
        })
        .returning();

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

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: incomeAccountId,
        incomeSourceId: context.pendingIncome.incomeSourceId,
        memberId: incomeScopeMemberId,
        paidByMemberId: budgetInfo.member.id,
        type: "income",
        status: "cleared",
        amount: context.pendingIncome.amount,
        description: capitalizedDescription || context.pendingIncome.incomeSourceName,
        date: getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

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

  // Create transfer transaction and update balances atomically
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

    // Update account balances: subtract from source, add to destination
    await tx
      .update(financialAccounts)
      .set({ balance: sql`${financialAccounts.balance} - ${context.pendingTransfer!.amount}` })
      .where(eq(financialAccounts.id, context.pendingTransfer!.fromAccountId!));

    await tx
      .update(financialAccounts)
      .set({ balance: sql`${financialAccounts.balance} + ${context.pendingTransfer!.amount}` })
      .where(eq(financialAccounts.id, context.pendingTransfer!.toAccountId!));

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
