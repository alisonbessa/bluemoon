import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { UserContext, ExtractedExpenseData } from "../types";
import { matchCategory, CONFIDENCE_THRESHOLDS } from "../gemini";
import { markLogAsConfirmed } from "../ai-logger";
import {
  findMatchingScheduledTransaction,
  findScheduledExpenseByHint,
} from "../transaction-matcher";
import { getTodayNoonUTC } from "../telegram-utils";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { calculateInstallmentDates } from "@/shared/lib/billing-cycle";
import {
  sendMessage,
  formatCurrency,
  createCategoryKeyboard,
  createConfirmationKeyboard,
  createNewCategoryKeyboard,
  createAccountKeyboard,
  deleteMessages,
} from "../bot";
import { updateTelegramContext, matchAccount, formatCategoryName, suggestGroupForCategory } from "./shared-utils";
import { getScopeFromCategory } from "@/shared/lib/transactions/scope";
import { distributeInstallmentAmounts } from "@/shared/lib/transactions/installments";

/**
 * Handle expense intent - register or update an expense
 */
export async function handleExpenseIntent(
  chatId: number,
  data: ExtractedExpenseData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = [],
  logId: string | null = null
): Promise<void> {
  const { budgetId, memberId, defaultAccountId, categories, accounts, currentYear, currentMonth } = userContext;

  if (!defaultAccountId) {
    await sendMessage(
      chatId,
      "Você precisa configurar uma conta padrão no app primeiro."
    );
    return;
  }

  // Try to match account from hint (e.g., "paguei com o cartão flash")
  const matchedAccount = data?.accountHint ? matchAccount(data.accountHint, accounts) : null;
  const accountId = matchedAccount?.id || defaultAccountId;
  const accountName = matchedAccount?.name;

  // Try to match category
  const categoryMatch = matchCategory(data?.categoryHint, categories);
  const categoryId = categoryMatch?.category.id;
  const categoryName = categoryMatch?.category.name;
  const categoryIcon = categoryMatch?.category.icon;

  // CASE 1: No amount provided (null, undefined, or 0) - try to find a scheduled transaction
  // AI sometimes returns 0 instead of null when no amount is mentioned
  if (!data?.amount || data.amount === 0) {
    // Try to find a scheduled expense by hint
    const scheduledByHint = await findScheduledExpenseByHint(
      budgetId,
      categoryId || null,
      data?.description || data?.categoryHint || null,
      currentYear,
      currentMonth
    );

    if (scheduledByHint && scheduledByHint.confidence >= 0.5) {
      // Found a matching scheduled expense - ask for confirmation
      const tx = scheduledByHint.transaction;
      const txCategoryName = tx.categoryName || categoryName || "Despesa";
      const txCategoryIcon = tx.categoryIcon || categoryIcon || "📁";

      let message = `📝 <b>Confirmar despesa?</b>\n\n`;
      message += `${txCategoryIcon} ${txCategoryName}\n`;
      message += `Valor: ${formatCurrency(tx.amount)}\n`;
      if (tx.description) {
        message += `Descrição: ${tx.description}\n`;
      }
      message += `\n💡 Encontrei esta despesa agendada. Deseja marcá-la como paga?`;

      const confirmMsgId = await sendMessage(chatId, message, {
        replyMarkup: createConfirmationKeyboard(),
      });

      await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
        pendingExpense: {
          amount: tx.amount,
          description: tx.description || undefined,
          categoryId: tx.categoryId || categoryId,
          categoryName: txCategoryName,
        },
        scheduledTransactionId: tx.id, // Store ID to update existing transaction
        messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
        lastAILogId: logId || undefined,
      });
      return;
    }

    // No scheduled expense found
    await sendMessage(
      chatId,
      "Não encontrei uma despesa agendada correspondente.\n\n" +
        "Por favor, informe o valor. Exemplo:\n" +
        `"paguei 200 de luz"`
    );
    return;
  }

  // CASE 2: Amount provided - normal flow
  // Calculate final confidence considering category match
  const categoryConfidence = categoryMatch?.confidence || 0;
  const finalConfidence = confidence * categoryConfidence;

  // Check if there's a matching scheduled transaction
  const scheduledMatch = categoryId
    ? await findMatchingScheduledTransaction(budgetId, categoryId, data.amount, currentYear, currentMonth)
    : null;

  // Derive scope from category (NULL = shared, set = personal to category owner)
  const scopeMemberId = getScopeFromCategory(categoryId, categories, memberId);

  // HIGH CONFIDENCE without scheduled match: Auto-save new transaction
  // Note: We NEVER auto-save when updating scheduled transactions - always confirm
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.HIGH && categoryId && !scheduledMatch) {
    // Delete processing messages before showing final result
    if (initialMessagesToDelete.length > 0) {
      await deleteMessages(chatId, initialMessagesToDelete);
    }

    const capitalizedDescription = capitalizeFirst(data.description);

    // Handle installments
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
      const installmentAmounts = distributeInstallmentAmounts(data.amount, data.totalInstallments);
      const transactionDate = data.date || getTodayNoonUTC();

      const installmentDates = calculateInstallmentDates(transactionDate, data.totalInstallments);

      // Create parent transaction (first installment)
      const [parentTransaction] = await db
        .insert(transactions)
        .values({
          budgetId,
          accountId,
          categoryId,
          memberId: scopeMemberId,
          paidByMemberId: memberId,
          type: "expense",
          status: "cleared",
          amount: installmentAmounts[0],
          description: capitalizedDescription,
          date: installmentDates[0],
          isInstallment: true,
          installmentNumber: 1,
          totalInstallments: data.totalInstallments,
          source: "telegram",
        })
        .returning();

      // Batch insert remaining installments
      const installmentValues = installmentAmounts.slice(1).map((amount, i) => ({
        budgetId,
        accountId,
        categoryId,
        memberId: scopeMemberId,
        paidByMemberId: memberId,
        type: "expense" as const,
        status: "cleared" as const,
        amount,
        description: capitalizedDescription,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments: data.totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: "telegram" as const,
      }));

      if (installmentValues.length > 0) {
        await db.insert(transactions).values(installmentValues);
      }

      await updateTelegramContext(chatId, "IDLE", {
        lastTransactionId: parentTransaction.id,
      });

      if (logId) await markLogAsConfirmed(logId);

      await sendMessage(
        chatId,
        `✅ <b>Compra parcelada registrada!</b>\n\n` +
          `${categoryIcon || "📁"} ${categoryName}\n` +
          `Valor total: ${formatCurrency(data.amount)}\n` +
          `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmounts[0])}\n` +
          (accountName ? `Conta: ${accountName}\n` : "") +
          (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n\n` : "\n") +
          `Use /desfazer para remover.`
      );
      return;
    }

    // Create new transaction (non-installment)
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId,
        accountId,
        categoryId,
        memberId: scopeMemberId,
        paidByMemberId: memberId,
        type: "expense",
        status: "cleared",
        amount: data.amount,
        description: capitalizedDescription,
        date: data.date || getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

    await updateTelegramContext(chatId, "IDLE", {
      lastTransactionId: newTransaction.id,
    });

    if (logId) await markLogAsConfirmed(logId);

    await sendMessage(
      chatId,
      `✅ <b>Gasto registrado!</b>\n\n` +
        `${categoryIcon || "📁"} ${categoryName}\n` +
        `Valor: ${formatCurrency(data.amount)}\n` +
        (accountName ? `Conta: ${accountName}\n` : "") +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
    return;
  }

  // MEDIUM CONFIDENCE: Ask for confirmation
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM && categoryId) {
    let message = `📝 <b>Confirmar registro?</b>\n\n`;
    message += `${categoryIcon || "📁"} ${categoryName}\n`;

    // Show installment info if applicable
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
      const installmentAmount = distributeInstallmentAmounts(data.amount, data.totalInstallments)[0];
      message += `Valor total: ${formatCurrency(data.amount)}\n`;
      message += `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
    } else {
      message += `Valor: ${formatCurrency(data.amount)}\n`;
    }

    if (accountName) {
      message += `Conta: ${accountName}\n`;
    }
    if (data.description) {
      message += `Descrição: ${data.description}\n`;
    }

    if (scheduledMatch && scheduledMatch.confidence >= 0.5) {
      message += `\n💡 Encontrei uma transação agendada similar que será atualizada.`;
    }

    const confirmMsgId = await sendMessage(chatId, message, {
      replyMarkup: createConfirmationKeyboard(),
    });

    await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
      pendingExpense: {
        amount: data.amount,
        description: data.description,
        categoryId,
        categoryName,
        accountId,
        accountName,
        isInstallment: data.isInstallment,
        totalInstallments: data.totalInstallments,
      },
      scheduledTransactionId: scheduledMatch?.transaction.id,
      messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
      lastAILogId: logId || undefined,
    });
    return;
  }

  // Check if AI was confident but category doesn't exist - suggest creating
  const shouldSuggestNewCategory =
    confidence >= CONFIDENCE_THRESHOLDS.HIGH &&
    data.categoryHint &&
    !categoryMatch;

  if (shouldSuggestNewCategory) {
    // Format the suggested name (capitalize first letter of each word)
    const suggestedName = formatCategoryName(data.categoryHint!);
    const suggestedGroupCode = suggestGroupForCategory(data.categoryHint!);

    let valueText = `Valor: ${formatCurrency(data.amount)}\n`;
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
      const installmentAmount = distributeInstallmentAmounts(data.amount, data.totalInstallments)[0];
      valueText = `Valor total: ${formatCurrency(data.amount)}\n` +
        `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
    }

    const newCatMsgId = await sendMessage(
      chatId,
      `💰 <b>Registrar gasto</b>\n\n` +
        valueText +
        (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
        `Não encontrei a categoria "<b>${data.categoryHint}</b>".\n` +
        `Deseja criar uma nova categoria?`,
      {
        replyMarkup: createNewCategoryKeyboard(suggestedName),
      }
    );

    await updateTelegramContext(chatId, "AWAITING_NEW_CATEGORY_CONFIRM", {
      pendingExpense: {
        amount: data.amount,
        description: data.description,
        accountId,
        accountName,
        isInstallment: data.isInstallment,
        totalInstallments: data.totalInstallments,
      },
      pendingNewCategory: {
        suggestedName,
        suggestedGroupId: suggestedGroupCode,
      },
      messagesToDelete: [...initialMessagesToDelete, newCatMsgId],
      lastAILogId: logId || undefined,
    });
    return;
  }

  // LOW CONFIDENCE or no category: Ask for account first (if not specified), then category
  let valueText = `Valor: ${formatCurrency(data.amount)}\n`;
  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
    const installmentAmount = distributeInstallmentAmounts(data.amount, data.totalInstallments)[0];
    valueText = `Valor total: ${formatCurrency(data.amount)}\n` +
      `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
  }

  // If no account was specified, ask for account first
  if (!matchedAccount && accounts.length > 1) {
    const accSelectMsgId = await sendMessage(
      chatId,
      `💰 <b>Registrar gasto</b>\n\n` +
        valueText +
        (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
        `Qual a forma de pagamento?`,
      {
        replyMarkup: createAccountKeyboard(accounts),
      }
    );

    await updateTelegramContext(chatId, "AWAITING_ACCOUNT", {
      pendingExpense: {
        amount: data.amount,
        description: data.description,
        isInstallment: data.isInstallment,
        totalInstallments: data.totalInstallments,
      },
      messagesToDelete: [...initialMessagesToDelete, accSelectMsgId],
      lastAILogId: logId || undefined,
    });
    return;
  }

  // Account already selected (or only one account), ask for category
  const catSelectMsgId = await sendMessage(
    chatId,
    `💰 <b>Registrar gasto</b>\n\n` +
      valueText +
      (accountName ? `Conta: ${accountName}\n` : "") +
      (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
      `Selecione a categoria:`,
    {
      replyMarkup: createCategoryKeyboard(categories),
    }
  );

  await updateTelegramContext(chatId, "AWAITING_CATEGORY", {
    pendingExpense: {
      amount: data.amount,
      description: data.description,
      accountId,
      accountName,
      isInstallment: data.isInstallment,
      totalInstallments: data.totalInstallments,
    },
    messagesToDelete: [...initialMessagesToDelete, catSelectMsgId],
    lastAILogId: logId || undefined,
  });
}
