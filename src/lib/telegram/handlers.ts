import { db } from "@/db";
import {
  telegramUsers,
  transactions,
  categories,
  budgetMembers,
  financialAccounts,
  budgets,
  users,
  groups,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { TelegramMessage, TelegramCallbackQuery } from "./types";
import type { TelegramConversationStep, TelegramConversationContext } from "@/db/schema/telegram-users";
import {
  sendMessage,
  answerCallbackQuery,
  formatCurrency,
  createCategoryKeyboard,
  createConfirmationKeyboard,
} from "./bot";

// Get or create telegram user state
async function getOrCreateTelegramUser(chatId: number, telegramUserId?: number, username?: string, firstName?: string) {
  const existing = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(telegramUsers)
    .values({
      chatId,
      telegramUserId,
      username,
      firstName,
    })
    .returning();

  return newUser;
}

// Update telegram user state
async function updateTelegramUser(
  chatId: number,
  step: TelegramConversationStep,
  context: TelegramConversationContext
) {
  await db
    .update(telegramUsers)
    .set({
      currentStep: step,
      context,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));
}

// Get user's default budget and account
async function getUserBudgetInfo(userId: string) {
  // Get user's first budget
  const membership = await db
    .select({
      budget: budgets,
      member: budgetMembers,
    })
    .from(budgetMembers)
    .innerJoin(budgets, eq(budgetMembers.budgetId, budgets.id))
    .where(eq(budgetMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  // Get default account (first checking account)
  const [defaultAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.budgetId, membership[0].budget.id),
        eq(financialAccounts.type, "checking")
      )
    )
    .limit(1);

  // Get expense categories (from groups that are not income)
  const budgetCategories = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      and(
        eq(categories.budgetId, membership[0].budget.id),
        eq(categories.isArchived, false)
      )
    );

  return {
    budget: membership[0].budget,
    member: membership[0].member,
    defaultAccount,
    categories: budgetCategories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
      icon: c.category.icon,
      groupName: c.group.name,
    })),
  };
}

// Parse amount from text (supports "50", "50,00", "50.00", "R$ 50,00")
function parseAmount(text: string): number | null {
  // Remove currency symbol and spaces
  let cleaned = text.replace(/R\$\s*/gi, "").trim();

  // Replace comma with dot for decimal
  cleaned = cleaned.replace(",", ".");

  const amount = parseFloat(cleaned);

  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // Convert to cents
  return Math.round(amount * 100);
}

// Handle connection request from deep link
async function handleConnectionRequest(chatId: number, telegramUserId: number, username?: string, firstName?: string, userId?: string) {
  if (!userId) {
    await sendMessage(chatId, "❌ Link de conexão inválido. Gere um novo no app.");
    return;
  }

  // Verify the user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    await sendMessage(chatId, "❌ Usuário não encontrado. Gere um novo link no app.");
    return;
  }

  // Check if this Telegram is already connected to another user
  const [existingTelegram] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (existingTelegram && existingTelegram.userId && existingTelegram.userId !== userId) {
    await sendMessage(
      chatId,
      "❌ Este Telegram já está conectado a outra conta.\n\n" +
        "Desconecte primeiro nas Configurações do app."
    );
    return;
  }

  // Check if user already has a different Telegram connected
  const [existingUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  if (existingUser && existingUser.chatId !== chatId) {
    await sendMessage(
      chatId,
      "❌ Sua conta já está conectada a outro Telegram.\n\n" +
        "Desconecte primeiro nas Configurações do app."
    );
    return;
  }

  // Update or create connection
  if (existingTelegram) {
    await db
      .update(telegramUsers)
      .set({
        userId,
        telegramUserId,
        username,
        firstName,
        currentStep: "IDLE",
        context: {},
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.chatId, chatId));
  } else {
    await db.insert(telegramUsers).values({
      chatId,
      telegramUserId,
      username,
      firstName,
      userId,
      currentStep: "IDLE",
      context: {},
    });
  }

  const name = user.displayName || user.name || "Usuário";

  await sendMessage(
    chatId,
    `✅ <b>Conta conectada com sucesso!</b>\n\n` +
      `Olá, <b>${name}</b>! Agora você pode registrar seus gastos enviando mensagens.\n\n` +
      `<b>Como usar:</b>\n` +
      `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
      `• Com descrição: <code>50 mercado</code>\n\n` +
      `Use /ajuda para ver todos os comandos.`
  );
}

// Handle /start command
async function handleStart(chatId: number, telegramUserId: number, username?: string, firstName?: string, startParam?: string) {
  const telegramUser = await getOrCreateTelegramUser(chatId, telegramUserId, username, firstName);

  // Check if this is a connection request with userId
  // Format: connect_CODE_USERID
  if (startParam && startParam.startsWith("connect_")) {
    const parts = startParam.split("_");
    if (parts.length >= 3) {
      const userId = parts[parts.length - 1]; // Last part is userId
      return handleConnectionRequest(chatId, telegramUserId, username, firstName, userId);
    }
  }

  if (telegramUser.userId) {
    // Already connected
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, telegramUser.userId))
      .limit(1);

    const name = user[0]?.displayName || user[0]?.name || "Usuário";

    await sendMessage(
      chatId,
      `👋 Olá, <b>${name}</b>!\n\n` +
        `Sua conta já está conectada.\n\n` +
        `<b>Como registrar gastos:</b>\n` +
        `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
        `• Com descrição: <code>50 mercado</code>\n\n` +
        `<b>Comandos:</b>\n` +
        `/ajuda - Ver todos os comandos\n` +
        `/desfazer - Desfazer último registro`
    );
  } else {
    // Not connected
    await sendMessage(
      chatId,
      `👋 Bem-vindo ao <b>HiveBudget</b>!\n\n` +
        `Para registrar seus gastos pelo Telegram, você precisa conectar sua conta.\n\n` +
        `<b>Como conectar:</b>\n` +
        `1. Acesse o app em hivebudget.com.br\n` +
        `2. Vá em Configurações > Conectar Telegram\n` +
        `3. Clique no link gerado\n\n` +
        `Aguardando conexão...`
    );
  }
}

// Handle verification code for connection
async function handleVerificationCode(chatId: number, code: string) {
  // Find user with this verification code
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser) {
    await sendMessage(chatId, "❌ Erro ao conectar. Tente novamente.");
    return;
  }

  // Look for pending verification in users table or a separate verification table
  // For simplicity, we'll check the code in the context
  const context = telegramUser.context as TelegramConversationContext;

  if (context.verificationCode === code) {
    // Check expiry
    if (context.verificationExpiry && new Date(context.verificationExpiry) < new Date()) {
      await sendMessage(chatId, "❌ Código expirado. Gere um novo link no app.");
      return;
    }

    // Code matches - but we need the userId from somewhere
    // This will be set when generating the link
    await sendMessage(
      chatId,
      `✅ <b>Conta conectada com sucesso!</b>\n\n` +
        `Agora você pode registrar seus gastos enviando mensagens.\n\n` +
        `<b>Exemplos:</b>\n` +
        `• <code>50</code> - Registra R$ 50,00\n` +
        `• <code>35,90 almoço</code> - R$ 35,90 com descrição\n\n` +
        `Use /ajuda para ver todos os comandos.`
    );

    await updateTelegramUser(chatId, "IDLE", {});
  } else {
    await sendMessage(chatId, "❌ Código inválido. Tente gerar um novo link no app.");
  }
}

// Handle /ajuda or /help command
async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `📚 <b>Comandos disponíveis:</b>\n\n` +
      `<b>Registrar gastos:</b>\n` +
      `• Envie apenas o valor: <code>50</code>\n` +
      `• Com descrição: <code>50 mercado</code>\n` +
      `• Com vírgula: <code>35,90</code>\n\n` +
      `<b>Comandos:</b>\n` +
      `/ajuda - Esta mensagem\n` +
      `/desfazer - Desfazer último registro\n` +
      `/cancelar - Cancelar operação atual\n\n` +
      `<b>Dicas:</b>\n` +
      `• O bot irá perguntar a categoria\n` +
      `• Você pode confirmar ou cancelar antes de salvar`
  );
}

// Handle /desfazer command
async function handleUndo(chatId: number) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(chatId, "❌ Você precisa conectar sua conta primeiro. Use /start");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.lastTransactionId) {
    await sendMessage(chatId, "❌ Nenhuma transação recente para desfazer.");
    return;
  }

  // Delete the last transaction
  const deleted = await db
    .delete(transactions)
    .where(eq(transactions.id, context.lastTransactionId))
    .returning();

  if (deleted.length > 0) {
    await sendMessage(
      chatId,
      `✅ Transação desfeita!\n\n` +
        `Valor: ${formatCurrency(deleted[0].amount)}\n` +
        `Descrição: ${deleted[0].description || "(sem descrição)"}`
    );

    // Clear last transaction from context
    await updateTelegramUser(chatId, "IDLE", {
      ...context,
      lastTransactionId: undefined,
    });
  } else {
    await sendMessage(chatId, "❌ Transação não encontrada ou já foi removida.");
  }
}

// Handle /cancelar command
async function handleCancel(chatId: number) {
  await updateTelegramUser(chatId, "IDLE", {});
  await sendMessage(chatId, "❌ Operação cancelada.");
}

// Handle expense input (amount with optional description)
async function handleExpenseInput(chatId: number, text: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(
      chatId,
      "❌ Você precisa conectar sua conta primeiro.\n\n" +
        "Acesse o app e vá em Configurações > Conectar Telegram"
    );
    return;
  }

  // Parse amount and description
  const parts = text.trim().split(/\s+/);
  const amountText = parts[0];
  const description = parts.slice(1).join(" ") || undefined;

  const amount = parseAmount(amountText);

  if (!amount) {
    await sendMessage(
      chatId,
      "❌ Valor inválido.\n\n" +
        "Envie um valor como:\n" +
        "• <code>50</code>\n" +
        "• <code>35,90</code>\n" +
        "• <code>50 mercado</code>"
    );
    return;
  }

  // Get user's budget info
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await sendMessage(
      chatId,
      "❌ Você precisa configurar seu orçamento primeiro no app.\n\n" +
        "Acesse hivebudget.com.br e complete a configuração."
    );
    return;
  }

  // Store pending expense and ask for category
  await updateTelegramUser(chatId, "AWAITING_CATEGORY", {
    pendingExpense: {
      amount,
      description,
    },
  });

  await sendMessage(
    chatId,
    `💰 <b>Registrar gasto</b>\n\n` +
      `Valor: <b>${formatCurrency(amount)}</b>\n` +
      (description ? `Descrição: ${description}\n\n` : "\n") +
      `Selecione a categoria:`,
    {
      replyMarkup: createCategoryKeyboard(budgetInfo.categories),
    }
  );
}

// Handle category selection callback
async function handleCategorySelection(chatId: number, categoryId: string, callbackQueryId: string) {
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

  // Update context with category
  await updateTelegramUser(chatId, "AWAITING_CONFIRMATION", {
    pendingExpense: {
      ...context.pendingExpense,
      categoryId,
      categoryName: category.name,
    },
  });

  await answerCallbackQuery(callbackQueryId);

  await sendMessage(
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
}

// Handle confirmation callback
async function handleConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.pendingExpense?.categoryId) {
    await answerCallbackQuery(callbackQueryId, "Erro: dados incompletos");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  if (!confirmed) {
    await updateTelegramUser(chatId, "IDLE", {});
    await sendMessage(chatId, "❌ Registro cancelado.");
    return;
  }

  // Get budget info for the transaction
  const budgetInfo = await getUserBudgetInfo(telegramUser.userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await sendMessage(chatId, "❌ Erro ao salvar. Configure seu orçamento no app.");
    return;
  }

  // Create the transaction
  const [newTransaction] = await db
    .insert(transactions)
    .values({
      budgetId: budgetInfo.budget.id,
      accountId: budgetInfo.defaultAccount.id,
      categoryId: context.pendingExpense.categoryId,
      memberId: budgetInfo.member.id,
      type: "expense",
      status: "cleared",
      amount: context.pendingExpense.amount,
      description: context.pendingExpense.description,
      date: new Date(),
      source: "telegram",
    })
    .returning();

  // Update state with last transaction for undo
  await updateTelegramUser(chatId, "IDLE", {
    lastTransactionId: newTransaction.id,
  });

  await sendMessage(
    chatId,
    `✅ <b>Gasto registrado!</b>\n\n` +
      `Valor: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
      `Categoria: ${context.pendingExpense.categoryName}\n` +
      (context.pendingExpense.description ? `Descrição: ${context.pendingExpense.description}\n\n` : "\n") +
      `Use /desfazer para remover este registro.`
  );
}

// Main message handler
export async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const from = message.from;

  if (!text || !from) return;

  // Handle commands
  if (text.startsWith("/")) {
    const [command, ...args] = text.split(" ");
    const cmdLower = command.toLowerCase();

    switch (cmdLower) {
      case "/start":
        const startParam = args[0];
        await handleStart(chatId, from.id, from.username, from.first_name, startParam);
        break;
      case "/ajuda":
      case "/help":
        await handleHelp(chatId);
        break;
      case "/desfazer":
      case "/undo":
        await handleUndo(chatId);
        break;
      case "/cancelar":
      case "/cancel":
        await handleCancel(chatId);
        break;
      default:
        await sendMessage(chatId, "Comando não reconhecido. Use /ajuda para ver os comandos disponíveis.");
    }
    return;
  }

  // Get current state
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  // If no state or IDLE, treat as expense input
  if (!telegramUser || telegramUser.currentStep === "IDLE") {
    await handleExpenseInput(chatId, text);
    return;
  }

  // Handle based on current step
  switch (telegramUser.currentStep) {
    case "AWAITING_VERIFICATION_CODE":
      await handleVerificationCode(chatId, text);
      break;
    default:
      // Any other state, treat as new expense (reset state)
      await handleExpenseInput(chatId, text);
  }
}

// Main callback query handler
export async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) return;

  if (data.startsWith("cat_")) {
    const categoryId = data.replace("cat_", "");
    await handleCategorySelection(chatId, categoryId, query.id);
  } else if (data === "confirm") {
    await handleConfirmation(chatId, true, query.id);
  } else if (data === "cancel") {
    await handleConfirmation(chatId, false, query.id);
  } else {
    await answerCallbackQuery(query.id, "Ação não reconhecida");
  }
}
