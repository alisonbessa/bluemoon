import { db } from "@/db";
import { transactions, telegramUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { UserContext, ExtractedExpenseData, ExtractedIncomeData, ExtractedTransferData } from "./types";
import type { TelegramConversationContext, TelegramConversationStep } from "@/db/schema/telegram-users";
import { matchCategory, matchIncomeSource, CONFIDENCE_THRESHOLDS } from "./gemini";
import {
  findMatchingScheduledTransaction,
  findMatchingScheduledIncome,
  findScheduledIncomeByHint,
  findScheduledExpenseByHint,
  markTransactionAsPaid,
} from "./transaction-matcher";
import { getTodayNoonUTC } from "./telegram-utils";
import { capitalizeFirst } from "@/lib/string-utils";
import {
  sendMessage,
  formatCurrency,
  createCategoryKeyboard,
  createConfirmationKeyboard,
  createNewCategoryKeyboard,
  createGroupKeyboard,
  deleteMessages,
} from "./bot";
import type { GroupCode } from "@/db/schema/groups";

/**
 * Handle expense intent - register or update an expense
 */
export async function handleExpenseIntent(
  chatId: number,
  data: ExtractedExpenseData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = []
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
      const installmentAmount = Math.round(data.amount / data.totalInstallments);
      const transactionDate = data.date || getTodayNoonUTC();

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
          date: transactionDate,
          isInstallment: true,
          installmentNumber: 1,
          totalInstallments: data.totalInstallments,
          source: "telegram",
        })
        .returning();

      // Batch insert remaining installments
      const installmentValues = Array.from({ length: data.totalInstallments - 1 }, (_, i) => {
        const installmentDate = new Date(transactionDate);
        installmentDate.setMonth(installmentDate.getMonth() + (i + 1));

        return {
          budgetId,
          accountId,
          categoryId,
          memberId,
          type: "expense" as const,
          status: "cleared" as const,
          amount: installmentAmount,
          description: capitalizedDescription,
          date: installmentDate,
          isInstallment: true,
          installmentNumber: i + 2,
          totalInstallments: data.totalInstallments,
          parentTransactionId: parentTransaction.id,
          source: "telegram" as const,
        };
      });

      if (installmentValues.length > 0) {
        await db.insert(transactions).values(installmentValues);
      }

      await updateTelegramContext(chatId, "IDLE", {
        lastTransactionId: parentTransaction.id,
      });

      await sendMessage(
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
        source: "telegram",
      })
      .returning();

    await updateTelegramContext(chatId, "IDLE", {
      lastTransactionId: newTransaction.id,
    });

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
      const installmentAmount = Math.round(data.amount / data.totalInstallments);
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
    });
    return;
  }

  // LOW CONFIDENCE or no category: Ask for category selection
  let valueText = `Valor: ${formatCurrency(data.amount)}\n`;
  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1) {
    const installmentAmount = Math.round(data.amount / data.totalInstallments);
    valueText = `Valor total: ${formatCurrency(data.amount)}\n` +
      `Parcelas: ${data.totalInstallments}x de ${formatCurrency(installmentAmount)}\n`;
  }

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
  });
}

/**
 * Handle income intent - register or update income
 */
export async function handleIncomeIntent(
  chatId: number,
  data: ExtractedIncomeData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = []
): Promise<void> {
  const { budgetId, memberId, defaultAccountId, incomeSources, currentYear, currentMonth } = userContext;

  if (!defaultAccountId) {
    await sendMessage(
      chatId,
      "Você precisa configurar uma conta padrão no app primeiro."
    );
    return;
  }

  // Try to match income source
  const sourceMatch = matchIncomeSource(data?.incomeSourceHint, incomeSources);
  const incomeSourceId = sourceMatch?.incomeSource.id;
  const incomeSourceName = sourceMatch?.incomeSource.name;

  console.log("[handleIncomeIntent] Starting", {
    chatId,
    confidence,
    dataAmount: data?.amount,
    dataDescription: data?.description,
    dataIncomeSourceHint: data?.incomeSourceHint,
    sourceMatch: sourceMatch ? { id: sourceMatch.incomeSource.id, name: sourceMatch.incomeSource.name, confidence: sourceMatch.confidence } : null,
    availableIncomeSources: incomeSources.map(s => ({ id: s.id, name: s.name })),
  });

  // CASE 1: No amount provided (null, undefined, or 0) - try to find a scheduled transaction
  // AI sometimes returns 0 instead of null when no amount is mentioned
  if (!data?.amount || data.amount === 0) {
    console.log("[handleIncomeIntent] CASE 1: No amount, searching by hint");
    // Try to find a scheduled income by hint
    const scheduledByHint = await findScheduledIncomeByHint(
      budgetId,
      incomeSourceId || null,
      data?.description || data?.incomeSourceHint || null,
      currentYear,
      currentMonth
    );

    console.log("[handleIncomeIntent] CASE 1 scheduledByHint result:", scheduledByHint ? {
      txId: scheduledByHint.transaction.id,
      txAmount: scheduledByHint.transaction.amount,
      txIncomeSourceName: scheduledByHint.transaction.incomeSourceName,
      confidence: scheduledByHint.confidence,
    } : null);

    if (scheduledByHint && scheduledByHint.confidence >= 0.5) {
      // Found a matching scheduled income - ask for confirmation
      const tx = scheduledByHint.transaction;
      const txSourceName = tx.incomeSourceName || incomeSourceName || "Receita";
      console.log("[handleIncomeIntent] CASE 1: Found match, asking confirmation for:", txSourceName);

      let message = `💵 <b>Confirmar receita?</b>\n\n`;
      message += `Fonte: ${txSourceName}\n`;
      message += `Valor: ${formatCurrency(tx.amount)}\n`;
      if (tx.description) {
        message += `Descrição: ${tx.description}\n`;
      }
      message += `\n💡 Encontrei esta receita agendada. Deseja marcá-la como recebida?`;

      const confirmMsgId = await sendMessage(chatId, message, {
        replyMarkup: createConfirmationKeyboard(),
      });

      await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
        pendingIncome: {
          amount: tx.amount,
          description: tx.description || undefined,
          incomeSourceId: tx.incomeSourceId || incomeSourceId,
          incomeSourceName: txSourceName,
        },
        scheduledTransactionId: tx.id, // Store ID to update existing transaction
        messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
      });
      return;
    }

    // No scheduled income found
    await sendMessage(
      chatId,
      "Não encontrei uma receita agendada correspondente.\n\n" +
        "Por favor, informe o valor. Exemplo:\n" +
        `"recebi 5000 de salário"`
    );
    return;
  }

  // CASE 2: Amount provided - normal flow
  console.log("[handleIncomeIntent] CASE 2: Amount provided, searching for scheduled match");
  // Check for matching scheduled income
  const scheduledMatch = await findMatchingScheduledIncome(
    budgetId,
    incomeSourceId || null,
    data.amount,
    currentYear,
    currentMonth
  );

  console.log("[handleIncomeIntent] CASE 2 scheduledMatch result:", scheduledMatch ? {
    txId: scheduledMatch.transaction.id,
    txAmount: scheduledMatch.transaction.amount,
    txIncomeSourceName: scheduledMatch.transaction.incomeSourceName,
    confidence: scheduledMatch.confidence,
  } : null);

  const finalConfidence = confidence * (sourceMatch?.confidence || 0.7);
  console.log("[handleIncomeIntent] finalConfidence:", finalConfidence, "threshold:", CONFIDENCE_THRESHOLDS.HIGH);

  // HIGH CONFIDENCE without scheduled match: Auto-save new transaction
  // Note: We NEVER auto-save when updating scheduled transactions - always confirm
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.HIGH && !scheduledMatch) {
    console.log("[handleIncomeIntent] HIGH CONFIDENCE path: Auto-saving new transaction");

    // Delete processing messages before showing final result
    if (initialMessagesToDelete.length > 0) {
      await deleteMessages(chatId, initialMessagesToDelete);
    }

    const capitalizedDescription = capitalizeFirst(data.description);

    // Create new income transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId,
        accountId: defaultAccountId,
        incomeSourceId,
        memberId,
        type: "income",
        status: "cleared",
        amount: data.amount,
        description: capitalizedDescription || incomeSourceName,
        date: data.date || getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

    await updateTelegramContext(chatId, "IDLE", {
      lastTransactionId: newTransaction.id,
    });

    await sendMessage(
      chatId,
      `✅ <b>Receita registrada!</b>\n\n` +
        (incomeSourceName ? `Fonte: ${incomeSourceName}\n` : "") +
        `Valor: ${formatCurrency(data.amount)}\n` +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
    return;
  }

  // MEDIUM/LOW CONFIDENCE: Ask for confirmation
  console.log("[handleIncomeIntent] MEDIUM/LOW CONFIDENCE path: Asking for confirmation", {
    scheduledMatchId: scheduledMatch?.transaction.id,
    incomeSourceName,
  });
  let message = `💵 <b>Confirmar receita?</b>\n\n`;
  if (incomeSourceName) {
    message += `Fonte: ${incomeSourceName}\n`;
  }
  message += `Valor: ${formatCurrency(data.amount)}\n`;
  if (data.description) {
    message += `Descrição: ${data.description}\n`;
  }

  if (scheduledMatch && scheduledMatch.confidence >= 0.4) {
    message += `\n💡 Encontrei uma receita agendada similar que será atualizada.`;
  }

  const confirmMsgId = await sendMessage(chatId, message, {
    replyMarkup: createConfirmationKeyboard(),
  });

  await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
    pendingIncome: {
      amount: data.amount,
      description: data.description,
      incomeSourceId,
      incomeSourceName,
    },
    scheduledTransactionId: scheduledMatch?.transaction.id,
    messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
  });
}

/**
 * Handle transfer intent - transfer between accounts
 */
export async function handleTransferIntent(
  chatId: number,
  data: ExtractedTransferData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = []
): Promise<void> {
  if (!data || !data.amount) {
    await sendMessage(chatId, "Não consegui identificar o valor da transferência.");
    return;
  }

  const { accounts } = userContext;

  // Try to match accounts
  const normalizeText = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const fromAccount = data.fromAccountHint
    ? accounts.find((a) =>
        normalizeText(a.name).includes(normalizeText(data.fromAccountHint!)) ||
        normalizeText(data.fromAccountHint!).includes(normalizeText(a.name))
      )
    : undefined;

  const toAccount = data.toAccountHint
    ? accounts.find((a) =>
        normalizeText(a.name).includes(normalizeText(data.toAccountHint!)) ||
        normalizeText(data.toAccountHint!).includes(normalizeText(a.name))
      )
    : undefined;

  if (!fromAccount || !toAccount) {
    await sendMessage(
      chatId,
      `Não consegui identificar as contas.\n\n` +
        `Suas contas disponíveis:\n` +
        accounts.map((a) => `- ${a.name}`).join("\n") +
        `\n\nTente: "transferi 500 de [conta origem] para [conta destino]"`
    );
    return;
  }

  if (fromAccount.id === toAccount.id) {
    await sendMessage(chatId, "As contas de origem e destino devem ser diferentes.");
    return;
  }

  // For now, transfers require confirmation
  const confirmMsgId = await sendMessage(
    chatId,
    `🔄 <b>Confirmar transferência?</b>\n\n` +
      `De: ${fromAccount.name}\n` +
      `Para: ${toAccount.name}\n` +
      `Valor: ${formatCurrency(data.amount)}\n` +
      (data.description ? `Descrição: ${data.description}\n` : ""),
    {
      replyMarkup: createConfirmationKeyboard(),
    }
  );

  await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
    pendingTransfer: {
      amount: data.amount,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      description: data.description,
    },
    messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
  });
}

/**
 * Update telegram user context
 */
async function updateTelegramContext(
  chatId: number,
  step: TelegramConversationStep,
  context: TelegramConversationContext
): Promise<void> {
  await db
    .update(telegramUsers)
    .set({
      currentStep: step,
      context,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));
}

/**
 * Format category name (capitalize first letter of each word)
 */
function formatCategoryName(hint: string): string {
  return hint
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Suggest a group code based on the category hint
 */
function suggestGroupForCategory(hint: string): GroupCode {
  const normalized = hint
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Essential: bills, housing, groceries, health, education, transport
  const essentialKeywords = [
    "luz", "energia", "eletricidade", "agua", "gas", "internet", "telefone",
    "aluguel", "condominio", "iptu", "moradia", "casa", "apartamento",
    "mercado", "supermercado", "feira", "acougue", "padaria", "hortifruti",
    "saude", "farmacia", "remedio", "medico", "hospital", "plano de saude",
    "educacao", "escola", "faculdade", "curso", "material escolar",
    "transporte", "combustivel", "gasolina", "onibus", "metro", "pedagio",
    "seguro", "impostos", "banco", "tarifa",
  ];

  // Lifestyle: dining out, clothing, subscriptions, gym, personal care
  const lifestyleKeywords = [
    "restaurante", "almoco", "janta", "lanche", "delivery", "ifood", "uber eats",
    "roupa", "vestuario", "calcado", "sapato", "tenis",
    "netflix", "spotify", "streaming", "assinatura", "amazon",
    "academia", "fitness", "esporte",
    "cabelo", "salao", "barbearia", "estetica", "cosmetico",
    "pet", "cachorro", "gato", "veterinario",
  ];

  // Pleasures: entertainment, hobbies, fun
  const pleasuresKeywords = [
    "cinema", "teatro", "show", "evento", "festa",
    "bar", "cerveja", "bebida", "balada",
    "jogo", "game", "playstation", "xbox",
    "hobby", "livro", "revista",
    "viagem", "passeio", "turismo", "hotel",
  ];

  // Investments: savings, investments
  const investmentKeywords = [
    "investimento", "poupanca", "reserva", "emergencia",
    "previdencia", "aposentadoria", "tesouro", "acoes",
    "cdb", "lci", "lca", "fundo",
  ];

  // Check each group
  if (essentialKeywords.some((kw) => normalized.includes(kw))) {
    return "essential";
  }
  if (lifestyleKeywords.some((kw) => normalized.includes(kw))) {
    return "lifestyle";
  }
  if (pleasuresKeywords.some((kw) => normalized.includes(kw))) {
    return "pleasures";
  }
  if (investmentKeywords.some((kw) => normalized.includes(kw))) {
    return "investments";
  }

  // Default to lifestyle for unknown categories
  return "lifestyle";
}

/**
 * Match account from hint text
 * Returns the matched account or null if no match found
 */
function matchAccount(
  hint: string,
  accounts: Array<{ id: string; name: string; type: string }>
): { id: string; name: string } | null {
  if (!hint || accounts.length === 0) return null;

  const normalizeText = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const normalizedHint = normalizeText(hint);

  // Direct name match (e.g., "flash" matches "Flash")
  for (const account of accounts) {
    const normalizedName = normalizeText(account.name);
    if (
      normalizedName.includes(normalizedHint) ||
      normalizedHint.includes(normalizedName)
    ) {
      return { id: account.id, name: account.name };
    }
  }

  // Common aliases for account types
  const aliases: Record<string, string[]> = {
    credit_card: ["cartao", "credito", "cartao de credito"],
    checking: ["debito", "conta corrente", "corrente"],
    savings: ["poupanca"],
    benefit: ["vr", "va", "flash", "alelo", "sodexo", "ticket", "beneficio"],
    cash: ["dinheiro", "especie"],
  };

  // Try matching by type aliases
  for (const account of accounts) {
    const typeAliases = aliases[account.type] || [];
    if (typeAliases.some((alias) => normalizedHint.includes(alias))) {
      return { id: account.id, name: account.name };
    }
  }

  return null;
}
