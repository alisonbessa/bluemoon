/**
 * Expense intent handler
 */

import { db } from "@/db";
import { transactions } from "@/db/schema";
import type {
  MessagingAdapter,
  ChatId,
  MessageId,
  UserContext,
  ExtractedExpenseData,
} from "../types";
import { matchCategory, CONFIDENCE_THRESHOLDS } from "../gemini";
import { markLogAsConfirmed } from "../ai-logger";
import {
  findMatchingScheduledTransaction,
  findScheduledExpenseByHint,
} from "../transaction-matcher";
import { getTodayNoonUTC, formatInstallmentMonths } from "../utils";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { formatCurrency } from "@/shared/lib/formatters";
import { getFirstInstallmentDate, calculateInstallmentDates } from "@/shared/lib/billing-cycle";
import { getVisibleCategories, formatCategoryName, suggestGroupForCategory } from "./category-utils";
import {
  matchAccount,
  filterAccountsByHint,
  getPaymentMethodLabel,
  getAccountIcon,
} from "./account-utils";

/**
 * Handle expense intent - register or update an expense
 */
export async function handleExpenseIntent(
  adapter: MessagingAdapter,
  chatId: ChatId,
  data: ExtractedExpenseData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: MessageId[] = [],
  logId: string | null = null
): Promise<void> {
  const { budgetId, memberId, defaultAccountId, accounts, currentYear, currentMonth } = userContext;
  // Only show/match categories this user can see (respects privacy mode)
  const categories = getVisibleCategories(userContext);

  if (!defaultAccountId) {
    await adapter.sendMessage(
      chatId,
      "Você precisa configurar uma conta padrão no app primeiro."
    );
    return;
  }

  // Try to match account from hint (e.g., "paguei com o cartão flash")
  const matchedAccount = data?.accountHint ? matchAccount(data.accountHint, accounts) : null;

  // If user mentioned a payment method but we couldn't match it, ask them to pick
  const unmatchedAccountHint = data?.accountHint && !matchedAccount;

  // For installments without explicit account, prefer credit card
  let accountId: string;
  let accountName: string;
  if (matchedAccount) {
    accountId = matchedAccount.id;
    accountName = matchedAccount.name;
  } else if (data?.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
    const creditCard = accounts.find(a => a.type === "credit_card");
    if (creditCard) {
      accountId = creditCard.id;
      accountName = creditCard.name;
    } else {
      accountId = defaultAccountId;
      accountName = accounts.find(a => a.id === defaultAccountId)?.name || "Conta padrão";
    }
  } else {
    accountId = defaultAccountId;
    accountName = accounts.find(a => a.id === defaultAccountId)?.name || "Conta padrão";
  }

  // Try to match category (using privacy-filtered list)
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

      const confirmMsgId = await adapter.sendConfirmation(chatId, message);

      await adapter.updateState(chatId, "AWAITING_CONFIRMATION", {
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
    await adapter.sendMessage(
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

  // HIGH CONFIDENCE without scheduled match: Auto-save new transaction
  // Note: We NEVER auto-save when updating scheduled transactions - always confirm
  // If user mentioned an account we couldn't match, don't auto-save — ask for account
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.HIGH && categoryId && !scheduledMatch && !unmatchedAccountHint) {
    // Delete processing messages before showing final result
    if (initialMessagesToDelete.length > 0) {
      await adapter.deleteMessages(chatId, initialMessagesToDelete);
    }

    const capitalizedDescription = capitalizeFirst(data.description);

    // Handle installments
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
      const installmentAmount = Math.round(data.amount / data.totalInstallments);
      const transactionDate = data.date || getTodayNoonUTC();

      // Check if account is a credit card with billing cycle
      const account = accounts.find(a => a.id === accountId);
      const closingDay = account?.type === "credit_card" ? account.closingDay : null;

      // Calculate installment dates using billing cycle if available
      let installmentDates: Date[];
      if (closingDay) {
        const firstDate = getFirstInstallmentDate(transactionDate, closingDay);
        installmentDates = calculateInstallmentDates(firstDate, data.totalInstallments);
      } else {
        installmentDates = Array.from({ length: data.totalInstallments }, (_, i) => {
          const d = new Date(transactionDate);
          d.setMonth(d.getMonth() + i);
          return d;
        });
      }

      // Create parent transaction (first installment)
      const [parentTransaction] = await db
        .insert(transactions)
        .values({
          budgetId,
          accountId,
          categoryId,
          memberId,
          type: "expense",
          status: "cleared",
          amount: installmentAmount,
          description: capitalizedDescription,
          date: installmentDates[0],
          isInstallment: true,
          installmentNumber: 1,
          totalInstallments: data.totalInstallments,
          source: adapter.platform,
        })
        .returning();

      // Batch insert remaining installments
      const installmentValues = Array.from({ length: data.totalInstallments - 1 }, (_, i) => ({
        budgetId,
        accountId,
        categoryId,
        memberId,
        type: "expense" as const,
        status: "cleared" as const,
        amount: installmentAmount,
        description: capitalizedDescription,
        date: installmentDates[i + 1],
        isInstallment: true,
        installmentNumber: i + 2,
        totalInstallments: data.totalInstallments,
        parentTransactionId: parentTransaction.id,
        source: adapter.platform as "telegram" | "whatsapp",
      }));

      if (installmentValues.length > 0) {
        await db.insert(transactions).values(installmentValues);
      }

      await adapter.updateState(chatId, "IDLE", {
        lastTransactionId: parentTransaction.id,
      });

      if (logId) await markLogAsConfirmed(logId);

      await adapter.sendMessage(
        chatId,
        `✅ <b>Compra parcelada registrada!</b>\n\n` +
          `${categoryIcon || "📁"} ${categoryName}\n` +
          `Valor total: ${formatCurrency(data.amount)}\n` +
          `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n` +
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
        memberId,
        type: "expense",
        status: "cleared",
        amount: data.amount,
        description: capitalizedDescription,
        date: data.date || getTodayNoonUTC(),
        source: adapter.platform,
      })
      .returning();

    await adapter.updateState(chatId, "IDLE", {
      lastTransactionId: newTransaction.id,
    });

    if (logId) await markLogAsConfirmed(logId);

    await adapter.sendMessage(
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
  // If user mentioned an account we couldn't match, skip to account selection flow
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM && categoryId && !unmatchedAccountHint) {
    let message = `📝 <b>Confirmar registro?</b>\n\n`;
    message += `${categoryIcon || "📁"} ${categoryName}\n`;

    // Show installment info if applicable
    if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
      const installmentAmount = Math.round(data.amount / data.totalInstallments);
      const monthsText = formatInstallmentMonths(data.totalInstallments);
      message += `Valor total: ${formatCurrency(data.amount)}\n`;
      message += `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)} ${monthsText}\n`;
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

    const confirmMsgId = await adapter.sendConfirmation(chatId, message);

    await adapter.updateState(chatId, "AWAITING_CONFIRMATION", {
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
      const installmentAmount = Math.round(data.amount / data.totalInstallments);
      valueText = `Valor total: ${formatCurrency(data.amount)}\n` +
        `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
    }

    const newCatMsgId = await adapter.sendNewCategoryPrompt(
      chatId,
      `💰 <b>Registrar gasto</b>\n\n` +
        valueText +
        (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
        `Não encontrei a categoria "<b>${data.categoryHint}</b>".\n` +
        `Deseja criar uma nova categoria?`,
      suggestedName
    );

    await adapter.updateState(chatId, "AWAITING_NEW_CATEGORY_CONFIRM", {
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
    const installmentAmount = Math.round(data.amount / data.totalInstallments);
    const monthsText = formatInstallmentMonths(data.totalInstallments);
    valueText = `Valor total: ${formatCurrency(data.amount)}\n` +
      `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)} ${monthsText}\n`;
  }

  // If no account was specified (or hint didn't match), ask for account first
  if (!matchedAccount && accounts.length > 1) {
    // Filter accounts by hint type if possible (e.g. "cartão" → show only credit cards)
    const filteredAccounts = unmatchedAccountHint
      ? filterAccountsByHint(data.accountHint!, accounts)
      : null;
    const accountsToShow = filteredAccounts || accounts;

    // If filtering narrowed it to exactly one account, auto-select it
    if (filteredAccounts && filteredAccounts.length === 1) {
      accountId = filteredAccounts[0].id;
      accountName = filteredAccounts[0].name;
    } else {
      const headerNote = unmatchedAccountHint
        ? (filteredAccounts
            ? getPaymentMethodLabel(data.accountHint!)
            : `Não encontrei a conta "<b>${data.accountHint}</b>".\nQual a forma de pagamento?`)
        : `Qual a forma de pagamento?`;

      const accSelectMsgId = await adapter.sendChoiceList(
        chatId,
        `💰 <b>Registrar gasto</b>\n\n` +
          valueText +
          (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
          headerNote,
        accountsToShow.map(a => ({ id: `acc_${a.id}`, label: `${getAccountIcon(a.type)} ${a.name}` })),
        "Contas"
      );

      await adapter.updateState(chatId, "AWAITING_ACCOUNT", {
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
  }

  // Account already selected (or only one account), ask for category
  const catSelectMsgId = await adapter.sendChoiceList(
    chatId,
    `💰 <b>Registrar gasto</b>\n\n` +
      valueText +
      (accountName ? `Conta: ${accountName}\n` : "") +
      (data.description ? `Descrição: ${data.description}\n\n` : "\n") +
      `Selecione a categoria:`,
    categories.map(c => ({ id: `cat_${c.id}`, label: `${c.icon || "📁"} ${c.name}` })),
    "Categorias"
  );

  await adapter.updateState(chatId, "AWAITING_CATEGORY", {
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
