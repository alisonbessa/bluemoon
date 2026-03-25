import { db } from "@/db";
import {
  telegramUsers,
  categories,
  financialAccounts,
  groups,
  transactions,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { TelegramConversationContext } from "@/db/schema/telegram-users";
import { getUserBudgetInfo, getCategoryBalanceSummary } from "@/integrations/messaging/lib/user-context";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import {
  sendMessage,
  answerCallbackQuery,
  formatCurrency,
  createCategoryKeyboard,
  createConfirmationKeyboard,
  createGroupKeyboard,
  createAccountKeyboard,
  deleteMessages,
} from "./bot";
import { getTodayNoonUTC } from "./telegram-utils";
import { formatInstallmentMonths } from "@/integrations/messaging/lib/utils";
import { markLogAsConfirmed } from "./ai-logger";
import { getFirstInstallmentDate, calculateInstallmentDates } from "@/shared/lib/billing-cycle";
import { updateTelegramUser } from "./user-management";

// Handle category selection callback
export async function handleCategorySelection(chatId: number, categoryId: string, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingExpense) {
    await answerCallbackQuery(callbackQueryId, "Erro: nenhum gasto pendente");
    return;
  }

  // Get category info
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId));

  if (!category) {
    await answerCallbackQuery(callbackQueryId, "Categoria não encontrada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  const confirmMsgId = await sendMessage(
    chatId,
    `📝 <b>Confirmar registro</b>\n\n` +
      `Valor: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
      `Categoria: ${category.icon || "📁"} ${category.name}\n` +
      (context.pendingExpense.description ? `Descrição: ${context.pendingExpense.description}\n\n` : "\n") +
      `Confirma o registro?`,
    {
      replyMarkup: createConfirmationKeyboard(),
    }
  );

  // Update context with category and save message to delete
  await updateTelegramUser(chatId, "AWAITING_CONFIRMATION", {
    pendingExpense: {
      ...context.pendingExpense,
      categoryId,
      categoryName: category.name,
    },
    messagesToDelete: [...(context.messagesToDelete || []), confirmMsgId],
  });
}

// Handle account selection callback
export async function handleAccountSelection(chatId: number, accountId: string, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingExpense) {
    await answerCallbackQuery(callbackQueryId, "Erro: nenhum gasto pendente");
    return;
  }

  // Get account info
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, accountId));

  if (!account) {
    await answerCallbackQuery(callbackQueryId, "Conta não encontrada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  // Get budget info to show categories
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  // Build value text
  let valueText = `Valor: ${formatCurrency(context.pendingExpense.amount)}\n`;
  if (context.pendingExpense.isInstallment && context.pendingExpense.totalInstallments && context.pendingExpense.totalInstallments > 1) {
    const installmentAmount = Math.round(context.pendingExpense.amount / context.pendingExpense.totalInstallments);
    valueText = `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
      `Parcelas: ${context.pendingExpense.totalInstallments}x de ${formatCurrency(installmentAmount)} ${formatInstallmentMonths(context.pendingExpense.totalInstallments)}\n`;
  }

  // Now ask for category
  const catSelectMsgId = await sendMessage(
    chatId,
    `💰 <b>Registrar gasto</b>\n\n` +
      valueText +
      `Conta: ${account.name}\n` +
      (context.pendingExpense.description ? `Descrição: ${context.pendingExpense.description}\n\n` : "\n") +
      `Selecione a categoria:`,
    {
      replyMarkup: createCategoryKeyboard(budgetInfo.categories),
    }
  );

  // Update context with account and proceed to category selection
  await updateTelegramUser(chatId, "AWAITING_CATEGORY", {
    pendingExpense: {
      ...context.pendingExpense,
      accountId: account.id,
      accountName: account.name,
    },
    messagesToDelete: [...(context.messagesToDelete || []), catSelectMsgId],
  });
}

// Handle new category: accept suggested name
export async function handleNewCategoryAccept(chatId: number, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  // Get budget info to get groups
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);
  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  // Get all groups from database
  const allGroups = await db.select().from(groups);

  const context = telegramUser.context as TelegramConversationContext;
  const suggestedName = context.pendingNewCategory?.suggestedName || "Nova Categoria";

  const groupMsgId = await sendMessage(
    chatId,
    `📁 <b>Criar categoria "${suggestedName}"</b>\n\n` +
      `Selecione o grupo para esta categoria:`,
    {
      replyMarkup: createGroupKeyboard(allGroups),
    }
  );

  await updateTelegramUser(chatId, "AWAITING_NEW_CATEGORY_GROUP", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), groupMsgId],
  });
}

// Handle new category: user wants to rename
export async function handleNewCategoryRename(chatId: number, callbackQueryId: string) {
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

  const renameMsgId = await sendMessage(
    chatId,
    `✏️ <b>Digite o nome da nova categoria:</b>\n\n` +
      `Exemplo: "Mercado", "Transporte", "Lazer"`
  );

  await updateTelegramUser(chatId, "AWAITING_NEW_CATEGORY_NAME", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), renameMsgId],
  });
}

// Handle new category: user wants to use existing category
export async function handleNewCategoryExisting(chatId: number, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  // Get budget info to get categories
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);
  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  const catMsgId = await sendMessage(
    chatId,
    `📁 <b>Selecione uma categoria existente:</b>`,
    {
      replyMarkup: createCategoryKeyboard(budgetInfo.categories),
    }
  );

  await updateTelegramUser(chatId, "AWAITING_CATEGORY", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), catMsgId],
  });
}

// Handle group selection for new category
export async function handleGroupSelection(chatId: number, groupId: string, callbackQueryId: string) {
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

  if (!context.pendingNewCategory || !context.pendingExpense) {
    await sendMessage(chatId, "Erro: dados incompletos. Tente novamente.");
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  // Get budget info
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);
  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const categoryName = context.pendingNewCategory.customName || context.pendingNewCategory.suggestedName;

  // Create the new category
  const [newCategory] = await db
    .insert(categories)
    .values({
      budgetId: budgetInfo.budget.id,
      groupId: groupId,
      name: categoryName,
      icon: "📁", // Default icon
      isArchived: false,
    })
    .returning();

  // Now create the transaction with the new category
  const capitalizedDescription = capitalizeFirst(context.pendingExpense.description);
  // Use account from context if specified, otherwise default
  const transactionAccountId = context.pendingExpense.accountId || budgetInfo.defaultAccount!.id;

  let transactionId: string;

  // Handle installments
  if (context.pendingExpense.isInstallment && context.pendingExpense.totalInstallments && context.pendingExpense.totalInstallments > 1) {
    const totalInstallments = context.pendingExpense.totalInstallments;
    const installmentAmount = Math.round(context.pendingExpense.amount / totalInstallments);
    const transactionDate = getTodayNoonUTC();

    // Check if account is a credit card with billing cycle
    const account = budgetInfo.accounts.find(a => a.id === transactionAccountId);
    const closingDay = account?.type === "credit_card" ? account.closingDay : null;

    // Calculate installment dates using billing cycle if available
    let installmentDates: Date[];
    if (closingDay) {
      const firstDate = getFirstInstallmentDate(transactionDate, closingDay);
      installmentDates = calculateInstallmentDates(firstDate, totalInstallments);
    } else {
      installmentDates = Array.from({ length: totalInstallments }, (_, i) => {
        const d = new Date(transactionDate);
        d.setMonth(d.getMonth() + i);
        return d;
      });
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
        source: "telegram",
      })
      .returning();

    // Batch insert remaining installments
    const installmentValues = Array.from({ length: totalInstallments - 1 }, (_, i) => ({
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
      source: "telegram" as const,
    }));

    if (installmentValues.length > 0) {
      await db.insert(transactions).values(installmentValues);
    }

    transactionId = parentTransaction.id;

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    // Get group name
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));

    const tgNewCatInstBalance = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      newCategory.id
    );

    await sendMessage(
      chatId,
      `✅ <b>Categoria criada e compra parcelada registrada!</b>\n\n` +
        `📁 Nova categoria: <b>${categoryName}</b>\n` +
        `📂 Grupo: ${group?.name || "—"}\n\n` +
        `💰 Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)}\n` +
        (context.pendingExpense.accountName ? `Conta: ${context.pendingExpense.accountName}\n` : "") +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n` : "") +
        `\n${tgNewCatInstBalance}\n\n` +
        `Use /desfazer para remover o gasto.`
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
        source: "telegram",
      })
      .returning();

    transactionId = newTransaction.id;

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    // Get group name
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));

    const tgNewCatBalance = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      newCategory.id
    );

    await sendMessage(
      chatId,
      `✅ <b>Categoria criada e gasto registrado!</b>\n\n` +
        `📁 Nova categoria: <b>${categoryName}</b>\n` +
        `📂 Grupo: ${group?.name || "—"}\n\n` +
        `💰 Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        (context.pendingExpense.accountName ? `Conta: ${context.pendingExpense.accountName}\n` : "") +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n` : "") +
        `\n${tgNewCatBalance}\n\n` +
        `Use /desfazer para remover o gasto.`
    );
  }
}

// Handle custom category name input
export async function handleCustomCategoryName(chatId: number, text: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(chatId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingNewCategory) {
    await sendMessage(chatId, "Erro: dados incompletos. Tente novamente.");
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  // Get groups
  const allGroups = await db.select().from(groups);

  const groupMsgId = await sendMessage(
    chatId,
    `📁 <b>Criar categoria "${text.trim()}"</b>\n\n` +
      `Selecione o grupo para esta categoria:`,
    {
      replyMarkup: createGroupKeyboard(allGroups),
    }
  );

  // Update context with custom name and save message to delete
  await updateTelegramUser(chatId, "AWAITING_NEW_CATEGORY_GROUP", {
    ...context,
    pendingNewCategory: {
      ...context.pendingNewCategory,
      customName: text.trim(),
    },
    messagesToDelete: [...(context.messagesToDelete || []), groupMsgId],
  });
}

// ============================================
// Account Creation Handlers
// ============================================

export async function handleNewAccountAccept(chatId: number, callbackQueryId: string) {
  await answerCallbackQuery(callbackQueryId, "Criando conta...");

  const [tgUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!tgUser?.userId) return;

  const context = tgUser.context as TelegramConversationContext;

  if (!context?.pendingNewAccount || !context?.pendingExpense) {
    await sendMessage(chatId, "Erro: dados incompletos. Tente novamente.");
    await updateTelegramUser(chatId, "IDLE", {});
    return;
  }

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await deleteMessages(chatId, context.messagesToDelete);
  }

  const budgetInfo = await getUserBudgetInfo(tgUser.userId);
  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const accountName = context.pendingNewAccount.suggestedName;
  const accountType = context.pendingNewAccount.suggestedType;

  // Create the new account
  const [newAccount] = await db
    .insert(financialAccounts)
    .values({
      budgetId: budgetInfo.budget.id,
      name: accountName,
      type: accountType as "credit_card" | "checking" | "savings" | "cash" | "investment" | "benefit",
      balance: 0,
      isArchived: false,
    })
    .returning();

  // Now proceed to category selection with the new account
  const catMsgId = await sendMessage(
    chatId,
    `✅ Conta "<b>${accountName}</b>" criada!\n\nSelecione a categoria:`,
    {
      parseMode: "HTML",
      replyMarkup: createCategoryKeyboard(budgetInfo.categories),
    }
  );

  await updateTelegramUser(chatId, "AWAITING_CATEGORY", {
    pendingExpense: {
      ...context.pendingExpense,
      accountId: newAccount.id,
      accountName: newAccount.name,
    },
    messagesToDelete: [catMsgId],
    lastAILogId: context.lastAILogId,
  });
}

export async function handleNewAccountExisting(chatId: number, callbackQueryId: string) {
  await answerCallbackQuery(callbackQueryId, "Escolher conta existente");

  const [tgUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!tgUser?.userId) return;

  const budgetInfo = await getUserBudgetInfo(tgUser.userId);
  if (!budgetInfo) {
    await sendMessage(chatId, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const context = tgUser.context as TelegramConversationContext;

  // Delete intermediate messages
  if (context?.messagesToDelete && context.messagesToDelete.length > 0) {
    await deleteMessages(chatId, context.messagesToDelete);
  }

  const accMsgId = await sendMessage(
    chatId,
    "Selecione uma conta existente:",
    {
      parseMode: "HTML",
      replyMarkup: createAccountKeyboard(budgetInfo.accounts),
    }
  );

  await updateTelegramUser(chatId, "AWAITING_ACCOUNT", {
    pendingExpense: context?.pendingExpense,
    messagesToDelete: [accMsgId],
    lastAILogId: context?.lastAILogId,
  });
}
