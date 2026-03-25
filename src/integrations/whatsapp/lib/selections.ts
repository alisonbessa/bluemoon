import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import {
  whatsappUsers,
  categories,
  financialAccounts,
  groups,
  transactions,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { ConversationContext } from "@/integrations/messaging/lib/types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import {
  getUserBudgetInfo,
  getCategoryBalanceSummary,
} from "@/integrations/messaging/lib/user-context";
import { markLogAsConfirmed } from "@/integrations/messaging/lib/ai-logger";
import { getTodayNoonUTC, formatInstallmentMonths } from "@/integrations/messaging/lib/utils";
import {
  getFirstInstallmentDate,
  calculateInstallmentDates,
} from "@/shared/lib/billing-cycle";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { formatCurrency } from "@/shared/lib/formatters";
import { getAccountIcon, getAccountTypeName, formatAccountDisplay } from "@/integrations/messaging/lib/ai-handlers/account-utils";
import { matchCategory } from "@/integrations/messaging/lib/gemini";
import { formatCategoryName, suggestGroupForCategory } from "@/integrations/messaging/lib/ai-handlers/category-utils";

const logger = createLogger("whatsapp:selections");
const adapter = new WhatsAppAdapter();

export async function handleCategorySelection(
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
    message += `Parcelas: ${context.pendingExpense.totalInstallments}x de ${formatCurrency(installmentAmount)} ${formatInstallmentMonths(context.pendingExpense.totalInstallments)}\n`;
  } else {
    message += `Valor: ${formatCurrency(context.pendingExpense.amount)}\n`;
  }

  if (context.pendingExpense.accountName) {
    message += `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`;
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

export async function handleAccountSelection(
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
      `Parcelas: ${context.pendingExpense.totalInstallments}x de ${formatCurrency(installmentAmount)} ${formatInstallmentMonths(context.pendingExpense.totalInstallments)}\n`;
  }

  // Check if AI suggested a category that doesn't exist — offer to create it
  const categoryHint = context.pendingExpense.categoryHint;
  if (categoryHint) {
    const catMatch = matchCategory(categoryHint, budgetInfo.categories);

    if (catMatch) {
      // Category exists — go straight to confirmation
      let confirmMsg = `*Confirmar registro?*\n\n`;
      confirmMsg += `${catMatch.category.icon || ""} ${catMatch.category.name}\n`;
      confirmMsg += valueText;
      confirmMsg += `${formatAccountDisplay(account.name, account.type)}\n`;
      if (context.pendingExpense.description) {
        confirmMsg += `Descrição: ${context.pendingExpense.description}\n`;
      }

      const confirmMsgId = await adapter.sendConfirmation(phoneNumber, confirmMsg);

      await adapter.updateState(phoneNumber, "AWAITING_CONFIRMATION", {
        pendingExpense: {
          ...context.pendingExpense,
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          categoryId: catMatch.category.id,
          categoryName: catMatch.category.name,
        },
        messagesToDelete: [
          ...(context.messagesToDelete || []),
          confirmMsgId,
        ],
        lastAILogId: context.lastAILogId,
      });
      return;
    }

    // Category doesn't exist — offer to create it
    const suggestedName = formatCategoryName(categoryHint);
    const suggestedGroupCode = suggestGroupForCategory(categoryHint);

    const newCatMsgId = await adapter.sendNewCategoryPrompt(
      phoneNumber,
      `*Registrar gasto*\n\n` +
        valueText +
        `${formatAccountDisplay(account.name, account.type)}\n` +
        (context.pendingExpense.description
          ? `Descrição: ${context.pendingExpense.description}\n\n`
          : "\n") +
        `Não encontrei a categoria "*${categoryHint}*".\n` +
        `Deseja criar uma nova categoria?`,
      suggestedName
    );

    await adapter.updateState(phoneNumber, "AWAITING_NEW_CATEGORY_CONFIRM", {
      pendingExpense: {
        ...context.pendingExpense,
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
      },
      pendingNewCategory: {
        suggestedName,
        suggestedGroupId: suggestedGroupCode,
      },
      messagesToDelete: [
        ...(context.messagesToDelete || []),
        newCatMsgId,
      ],
      lastAILogId: context.lastAILogId,
    });
    return;
  }

  // No category hint — show category list
  const catSelectMsgId = await adapter.sendChoiceList(
    phoneNumber,
    `*Registrar gasto*\n\n` +
      valueText +
      `${formatAccountDisplay(account.name, account.type)}\n` +
      (context.pendingExpense.description
        ? `Descrição: ${context.pendingExpense.description}\n\n`
        : "\n") +
      `Selecione a categoria:`,
    budgetInfo.categories.map((c) => ({
      id: `cat_${c.id}`,
      label: `${c.icon || ""} ${c.name}`,
    })),
    "Categorias"
  );

  await adapter.updateState(phoneNumber, "AWAITING_CATEGORY", {
    pendingExpense: {
      ...context.pendingExpense,
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
    },
    messagesToDelete: [
      ...(context.messagesToDelete || []),
      catSelectMsgId,
    ],
    lastAILogId: context.lastAILogId,
  });
}

export async function handleNewCategoryAccept(phoneNumber: string): Promise<void> {
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

export async function handleNewCategoryRename(phoneNumber: string): Promise<void> {
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

export async function handleNewCategoryExisting(phoneNumber: string): Promise<void> {
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
    })),
    "Categorias"
  );

  await adapter.updateState(phoneNumber, "AWAITING_CATEGORY", {
    ...context,
    messagesToDelete: [...(context.messagesToDelete || []), catMsgId],
  });
}

export async function handleCustomCategoryName(
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

export async function handleGroupSelection(
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

    const newCatInstallmentBalanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      newCategory.id
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Categoria criada e compra parcelada registrada!*\n\n` +
        `Nova categoria: *${categoryName}*\n` +
        `Grupo: ${group?.name || "---"}\n\n` +
        `Valor total: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `Parcelas: ${totalInstallments}x de ${formatCurrency(installmentAmount)}\n` +
        (context.pendingExpense.accountName
          ? `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n`
          : "") +
        `\n${newCatInstallmentBalanceLine}\n\n` +
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

    const newCatBalanceLine = await getCategoryBalanceSummary(
      budgetInfo.budget.id,
      newCategory.id
    );

    await adapter.sendMessage(
      phoneNumber,
      `*Categoria criada e gasto registrado!*\n\n` +
        `Nova categoria: *${categoryName}*\n` +
        `Grupo: ${group?.name || "---"}\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        (context.pendingExpense.accountName
          ? `${formatAccountDisplay(context.pendingExpense.accountName, context.pendingExpense.accountType)}\n`
          : "") +
        (capitalizedDescription
          ? `Descrição: ${capitalizedDescription}\n`
          : "") +
        `\n${newCatBalanceLine}\n\n` +
        `Envie *desfazer* para remover.`
    );
  }
}

// ============================================
// Account Creation Handlers
// ============================================

export async function handleNewAccountAccept(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingNewAccount || !context.pendingExpense) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos. Tente novamente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  const budgetInfo = await getUserBudgetInfo(waUser.userId);
  if (!budgetInfo) {
    await adapter.sendMessage(phoneNumber, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const accountName = context.pendingNewAccount.suggestedName;
  const accountType = context.pendingNewAccount.suggestedType;

  // If credit card and no closingDay yet, ask for it
  if (accountType === "credit_card" && !context.pendingNewAccount.closingDay) {
    await adapter.sendMessage(
      phoneNumber,
      `*Qual o dia de fechamento da fatura do ${accountName}?*\n\nResponda com um número de 1 a 31.`
    );

    await adapter.updateState(phoneNumber, "AWAITING_CLOSING_DAY", {
      ...context,
      messagesToDelete: [], // Already deleted above
    });
    return;
  }

  // Create the new account
  const [newAccount] = await db
    .insert(financialAccounts)
    .values({
      budgetId: budgetInfo.budget.id,
      name: accountName,
      type: accountType as "credit_card" | "checking" | "savings" | "cash" | "investment" | "benefit",
      balance: 0,
      isArchived: false,
      ownerId: budgetInfo.member.id,
      ...(context.pendingNewAccount.closingDay && {
        closingDay: context.pendingNewAccount.closingDay,
      }),
    })
    .returning();

  const typeName = getAccountTypeName(accountType);

  const updatedExpense = {
    ...context.pendingExpense,
    accountId: newAccount.id,
    accountName: newAccount.name,
    accountType: newAccount.type,
  };

  // Check if AI suggested a category that doesn't exist — offer to create it
  const categoryHint = context.pendingExpense.categoryHint;
  if (categoryHint) {
    const catMatch = matchCategory(categoryHint, budgetInfo.categories);

    if (catMatch) {
      // Category exists — go straight to confirmation
      let confirmMsg = `*Conta "${accountName}" criada!* (${typeName})\n\n`;
      confirmMsg += `*Confirmar registro?*\n\n`;
      confirmMsg += `${catMatch.category.icon || ""} ${catMatch.category.name}\n`;
      confirmMsg += `Valor: ${formatCurrency(context.pendingExpense.amount)}\n`;
      confirmMsg += `${formatAccountDisplay(accountName, accountType)}\n`;
      if (context.pendingExpense.description) {
        confirmMsg += `Descrição: ${context.pendingExpense.description}\n`;
      }

      const confirmMsgId = await adapter.sendConfirmation(phoneNumber, confirmMsg);

      await adapter.updateState(phoneNumber, "AWAITING_CONFIRMATION", {
        pendingExpense: {
          ...updatedExpense,
          categoryId: catMatch.category.id,
          categoryName: catMatch.category.name,
        },
        messagesToDelete: [confirmMsgId],
        lastAILogId: context.lastAILogId,
      });
      return;
    }

    // Category doesn't exist — offer to create it
    const suggestedName = formatCategoryName(categoryHint);
    const suggestedGroupCode = suggestGroupForCategory(categoryHint);

    const newCatMsgId = await adapter.sendNewCategoryPrompt(
      phoneNumber,
      `*Conta "${accountName}" criada!* (${typeName})\n\n` +
        `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
        `${formatAccountDisplay(accountName, accountType)}\n` +
        (context.pendingExpense.description
          ? `Descrição: ${context.pendingExpense.description}\n\n`
          : "\n") +
        `Não encontrei a categoria "*${categoryHint}*".\n` +
        `Deseja criar uma nova categoria?`,
      suggestedName
    );

    await adapter.updateState(phoneNumber, "AWAITING_NEW_CATEGORY_CONFIRM", {
      pendingExpense: updatedExpense,
      pendingNewCategory: {
        suggestedName,
        suggestedGroupId: suggestedGroupCode,
      },
      messagesToDelete: [newCatMsgId],
      lastAILogId: context.lastAILogId,
    });
    return;
  }

  // No category hint — show category list
  const catMsgId = await adapter.sendChoiceList(
    phoneNumber,
    `*Conta "${accountName}" criada!* (${typeName})\n\n` +
      `Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
      `${formatAccountDisplay(accountName, accountType)}\n` +
      (context.pendingExpense.description
        ? `Descrição: ${context.pendingExpense.description}\n\n`
        : "\n") +
      `Selecione a categoria:`,
    budgetInfo.categories.map((c) => ({
      id: `cat_${c.id}`,
      label: `${c.icon || ""} ${c.name}`,
    })),
    "Categorias"
  );

  await adapter.updateState(phoneNumber, "AWAITING_CATEGORY", {
    pendingExpense: updatedExpense,
    messagesToDelete: [catMsgId],
    lastAILogId: context.lastAILogId,
  });
}

export async function handleNewAccountExisting(phoneNumber: string): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const budgetInfo = await getUserBudgetInfo(waUser.userId);
  if (!budgetInfo) {
    await adapter.sendMessage(phoneNumber, "Erro ao carregar informações. Tente novamente.");
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;

  // Delete intermediate messages
  if (context.messagesToDelete && context.messagesToDelete.length > 0) {
    await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
  }

  const accMsgId = await adapter.sendChoiceList(
    phoneNumber,
    `*Selecione uma conta existente:*`,
    budgetInfo.accounts.map((a) => ({
      id: `acc_${a.id}`,
      label: `${getAccountIcon(a.type)} ${a.name}`,
    })),
    "Contas"
  );

  await adapter.updateState(phoneNumber, "AWAITING_ACCOUNT", {
    pendingExpense: context.pendingExpense,
    messagesToDelete: [accMsgId],
    lastAILogId: context.lastAILogId,
  });
}

export async function handleClosingDay(
  phoneNumber: string,
  text: string
): Promise<void> {
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) return;

  const context = (waUser.context || {}) as ConversationContext;

  if (!context.pendingNewAccount || !context.pendingExpense) {
    await adapter.sendMessage(phoneNumber, "Erro: dados incompletos. Tente novamente.");
    await adapter.updateState(phoneNumber, "IDLE", {});
    return;
  }

  const day = parseInt(text.trim(), 10);
  if (isNaN(day) || day < 1 || day > 31) {
    await adapter.sendMessage(
      phoneNumber,
      "Por favor, informe um número de *1 a 31* para o dia de fechamento."
    );
    return;
  }

  // Store closing day and re-trigger account creation
  await adapter.updateState(phoneNumber, "AWAITING_NEW_ACCOUNT_CONFIRM", {
    ...context,
    pendingNewAccount: {
      ...context.pendingNewAccount,
      closingDay: day,
    },
  });

  // Re-trigger account creation now that closingDay is set
  await handleNewAccountAccept(phoneNumber);
}
