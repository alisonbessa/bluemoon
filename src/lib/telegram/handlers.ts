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
  incomeSources,
  goals,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import type { TelegramMessage, TelegramCallbackQuery, UserContext } from "./types";
import type { TelegramConversationStep, TelegramConversationContext } from "@/db/schema/telegram-users";
import {
  sendMessage,
  answerCallbackQuery,
  formatCurrency,
  createCategoryKeyboard,
  createConfirmationKeyboard,
  createGroupKeyboard,
  deleteMessages,
} from "./bot";
import { parseUserMessage } from "./gemini";
import { routeIntent } from "./intent-router";
import { handleVoiceMessage, isValidAudioDuration, isValidAudioSize } from "./voice-handler";
import { markTransactionAsPaid } from "./transaction-matcher";
import { getTodayNoonUTC } from "./telegram-utils";

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

  const budgetId = membership[0].budget.id;

  // Get all accounts
  const budgetAccounts = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.budgetId, budgetId));

  // Get default account (first checking account)
  const defaultAccount = budgetAccounts.find((a) => a.type === "checking");

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
        eq(categories.budgetId, budgetId),
        eq(categories.isArchived, false)
      )
    );

  // Get income sources
  const budgetIncomeSources = await db
    .select()
    .from(incomeSources)
    .where(
      and(
        eq(incomeSources.budgetId, budgetId),
        eq(incomeSources.isActive, true)
      )
    );

  // Get goals
  const budgetGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.budgetId, budgetId),
        eq(goals.isArchived, false)
      )
    );

  // Get pending transactions for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const pendingTxs = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: transactions.categoryId,
      incomeSourceId: transactions.incomeSourceId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.status, "pending"),
        gte(transactions.date, startOfMonth),
        lte(transactions.date, endOfMonth)
      )
    );

  // Map pending transactions with category/income source names
  const pendingTransactions = pendingTxs.map((tx) => {
    const category = tx.categoryId
      ? budgetCategories.find((c) => c.category.id === tx.categoryId)
      : null;
    const incomeSource = tx.incomeSourceId
      ? budgetIncomeSources.find((s) => s.id === tx.incomeSourceId)
      : null;

    return {
      id: tx.id,
      type: tx.type as "income" | "expense",
      amount: tx.amount,
      description: tx.description,
      categoryName: category?.category.name || null,
      incomeSourceName: incomeSource?.name || null,
    };
  });

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
    incomeSources: budgetIncomeSources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
    })),
    goals: budgetGoals.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
    })),
    accounts: budgetAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
    })),
    pendingTransactions,
  };
}

// Build user context for AI parsing
function buildUserContext(userId: string, budgetInfo: NonNullable<Awaited<ReturnType<typeof getUserBudgetInfo>>>): UserContext {
  const now = new Date();
  return {
    userId,
    budgetId: budgetInfo.budget.id,
    currentMonth: now.getMonth() + 1,
    currentYear: now.getFullYear(),
    categories: budgetInfo.categories,
    incomeSources: budgetInfo.incomeSources,
    goals: budgetInfo.goals,
    accounts: budgetInfo.accounts,
    pendingTransactions: budgetInfo.pendingTransactions,
    defaultAccountId: budgetInfo.defaultAccount?.id,
    memberId: budgetInfo.member.id,
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
  console.log("[Telegram] handleConnectionRequest called with userId:", userId);

  if (!userId) {
    await sendMessage(chatId, "❌ Link de conexao invalido. Gere um novo no app.");
    return;
  }

  // Verify the user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    await sendMessage(chatId, "❌ Usuario nao encontrado. Gere um novo link no app.");
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
      "❌ Este Telegram ja esta conectado a outra conta.\n\n" +
        "Desconecte primeiro nas Configuracoes do app."
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
      "❌ Sua conta ja esta conectada a outro Telegram.\n\n" +
        "Desconecte primeiro nas Configuracoes do app."
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

  const name = user.displayName || user.name || "Usuario";

  await sendMessage(
    chatId,
    `✅ <b>Conta conectada com sucesso!</b>\n\n` +
      `Ola, <b>${name}</b>! Agora voce pode registrar seus gastos enviando mensagens.\n\n` +
      `<b>Como usar:</b>\n` +
      `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
      `• Com descricao: <code>50 mercado</code>\n\n` +
      `Use /ajuda para ver todos os comandos.`
  );
}

// Handle /start command
async function handleStart(chatId: number, telegramUserId: number, username?: string, firstName?: string, startParam?: string) {
  console.log("[Telegram] handleStart called with startParam:", startParam);

  const telegramUser = await getOrCreateTelegramUser(chatId, telegramUserId, username, firstName);

  // Check if this is a connection request with userId
  // Format: connect_CODE_USERID (userId is a UUID with hyphens)
  if (startParam && startParam.startsWith("connect_")) {
    // Remove "connect_" prefix, then split only on first underscore to get code and userId
    const withoutPrefix = startParam.substring(8); // Remove "connect_"
    const firstUnderscoreIndex = withoutPrefix.indexOf("_");
    console.log("[Telegram] withoutPrefix:", withoutPrefix, "firstUnderscoreIndex:", firstUnderscoreIndex);
    if (firstUnderscoreIndex > 0) {
      const userId = withoutPrefix.substring(firstUnderscoreIndex + 1); // Everything after the code
      console.log("[Telegram] Extracted userId:", userId);
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

    const name = user[0]?.displayName || user[0]?.name || "Usuario";

    await sendMessage(
      chatId,
      `👋 Ola, <b>${name}</b>!\n\n` +
        `Sua conta ja esta conectada.\n\n` +
        `<b>Como registrar gastos:</b>\n` +
        `• Envie o valor: <code>50</code> ou <code>50,00</code>\n` +
        `• Com descricao: <code>50 mercado</code>\n\n` +
        `<b>Comandos:</b>\n` +
        `/ajuda - Ver todos os comandos\n` +
        `/desfazer - Desfazer ultimo registro`
    );
  } else {
    // Not connected
    await sendMessage(
      chatId,
      `👋 Bem-vindo ao <b>HiveBudget</b>!\n\n` +
        `Para registrar seus gastos pelo Telegram, voce precisa conectar sua conta.\n\n` +
        `<b>Como conectar:</b>\n` +
        `1. Acesse o app em hivebudget.com.br\n` +
        `2. Va em Configuracoes > Conectar Telegram\n` +
        `3. Clique no link gerado\n\n` +
        `Aguardando conexao...`
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
      await sendMessage(chatId, "❌ Codigo expirado. Gere um novo link no app.");
      return;
    }

    // Code matches - but we need the userId from somewhere
    // This will be set when generating the link
    await sendMessage(
      chatId,
      `✅ <b>Conta conectada com sucesso!</b>\n\n` +
        `Agora voce pode registrar seus gastos enviando mensagens.\n\n` +
        `<b>Exemplos:</b>\n` +
        `• <code>50</code> - Registra R$ 50,00\n` +
        `• <code>35,90 almoco</code> - R$ 35,90 com descricao\n\n` +
        `Use /ajuda para ver todos os comandos.`
    );

    await updateTelegramUser(chatId, "IDLE", {});
  } else {
    await sendMessage(chatId, "❌ Codigo invalido. Tente gerar um novo link no app.");
  }
}

// Handle /ajuda or /help command
async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `📚 <b>O que posso fazer:</b>\n\n` +
      `<b>Registrar gastos:</b>\n` +
      `"gastei 50 no mercado"\n` +
      `"paguei 200 de luz"\n\n` +
      `<b>Registrar receitas:</b>\n` +
      `"recebi 5000 de salário"\n` +
      `"entrou 150 de freelance"\n\n` +
      `<b>Consultas:</b>\n` +
      `"quanto gastei esse mês?"\n` +
      `"quanto sobrou em alimentação?"\n` +
      `"como está minha meta de viagem?"\n\n` +
      `<b>Áudio:</b>\n` +
      `Envie uma mensagem de voz!\n\n` +
      `<b>Comandos:</b>\n` +
      `/ajuda - Esta mensagem\n` +
      `/desfazer - Desfazer último registro\n` +
      `/cancelar - Cancelar operação atual`
  );
}

// Handle /desfazer command
async function handleUndo(chatId: number) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(chatId, "❌ Voce precisa conectar sua conta primeiro. Use /start");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;

  if (!context.lastTransactionId) {
    await sendMessage(chatId, "❌ Nenhuma transacao recente para desfazer.");
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
      `✅ Transacao desfeita!\n\n` +
        `Valor: ${formatCurrency(deleted[0].amount)}\n` +
        `Descricao: ${deleted[0].description || "(sem descricao)"}`
    );

    // Clear last transaction from context
    await updateTelegramUser(chatId, "IDLE", {
      ...context,
      lastTransactionId: undefined,
    });
  } else {
    await sendMessage(chatId, "❌ Transacao nao encontrada ou ja foi removida.");
  }
}

// Handle /cancelar command
async function handleCancel(chatId: number) {
  await updateTelegramUser(chatId, "IDLE", {});
  await sendMessage(chatId, "❌ Operacao cancelada.");
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
      "❌ Voce precisa conectar sua conta primeiro.\n\n" +
        "Acesse o app e va em Configuracoes > Conectar Telegram"
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
      "❌ Valor invalido.\n\n" +
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
      "❌ Voce precisa configurar seu orcamento primeiro no app.\n\n" +
        "Acesse hivebudget.com.br e complete a configuracao."
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
      (description ? `Descricao: ${description}\n\n` : "\n") +
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
    await answerCallbackQuery(callbackQueryId, "Erro: conta nao conectada");
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
    await answerCallbackQuery(callbackQueryId, "Categoria nao encontrada");
    return;
  }

  await answerCallbackQuery(callbackQueryId);

  const confirmMsgId = await sendMessage(
    chatId,
    `📝 <b>Confirmar registro</b>\n\n` +
      `Valor: <b>${formatCurrency(context.pendingExpense.amount)}</b>\n` +
      `Categoria: ${category.icon || "📁"} ${category.name}\n` +
      (context.pendingExpense.description ? `Descricao: ${context.pendingExpense.description}\n\n` : "\n") +
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

// Handle confirmation callback
async function handleConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta nao conectada");
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
    await sendMessage(chatId, "❌ Erro ao salvar. Configure seu orcamento no app.");
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
        date: getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

    transactionId = newTransaction.id;

    // Update state with last transaction for undo
    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
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
}

// Handle AI-powered message processing
async function handleAIMessage(chatId: number, text: string, userId: string, messagesToDelete: number[] = []) {
  // Get user's budget info
  const budgetInfo = await getUserBudgetInfo(userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    // Delete any pending messages before showing error
    if (messagesToDelete.length > 0) {
      await deleteMessages(chatId, messagesToDelete);
    }
    await sendMessage(
      chatId,
      "Você precisa configurar seu orçamento primeiro no app.\n\n" +
        "Acesse hivebudget.com.br e complete a configuração."
    );
    return;
  }

  // Build user context for AI
  const userContext = buildUserContext(userId, budgetInfo);

  try {
    // Parse message with AI
    const aiResponse = await parseUserMessage(text, userContext);
    console.log("[handleAIMessage] AI Response:", {
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      requiresConfirmation: aiResponse.requiresConfirmation,
      data: aiResponse.data,
    });

    // Route to appropriate handler (also logs the AI response for analysis)
    await routeIntent(chatId, aiResponse, userContext, text, messagesToDelete);
  } catch (error) {
    console.error("[Telegram] AI processing error:", error);
    // Delete pending messages before fallback
    if (messagesToDelete.length > 0) {
      await deleteMessages(chatId, messagesToDelete);
    }
    // Fallback to manual expense input
    await handleExpenseInput(chatId, text);
  }
}

// Handle voice message
async function handleVoice(chatId: number, message: TelegramMessage) {
  const voice = message.voice;
  if (!voice) return;

  // Validate audio
  if (!isValidAudioDuration(voice.duration)) {
    await sendMessage(chatId, "O áudio deve ter no máximo 60 segundos.");
    return;
  }

  if (!isValidAudioSize(voice.file_size)) {
    await sendMessage(chatId, "O arquivo de áudio é muito grande.");
    return;
  }

  // Get telegram user
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await sendMessage(
      chatId,
      "Você precisa conectar sua conta primeiro.\n\n" +
        "Acesse o app e vá em Configurações > Conectar Telegram"
    );
    return;
  }

  // Transcribe and process
  const { transcription, messagesToDelete } = await handleVoiceMessage(chatId, voice);

  if (transcription) {
    // Process transcribed text through AI pipeline, passing messages to delete
    await handleAIMessage(chatId, transcription, telegramUser.userId, messagesToDelete);
  }
}

// Main message handler
export async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const from = message.from;

  if (!from) return;

  // Handle voice messages
  if (message.voice) {
    await handleVoice(chatId, message);
    return;
  }

  const text = message.text?.trim();
  if (!text) return;

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
        await sendMessage(chatId, "Comando nao reconhecido. Use /ajuda para ver os comandos disponiveis.");
    }
    return;
  }

  // Get current state
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  // Check if user is connected
  if (!telegramUser?.userId) {
    await sendMessage(
      chatId,
      "Você precisa conectar sua conta primeiro.\n\n" +
        "Acesse o app e vá em Configurações > Conectar Telegram"
    );
    return;
  }

  // Handle based on current step
  switch (telegramUser.currentStep) {
    case "AWAITING_VERIFICATION_CODE":
      await handleVerificationCode(chatId, text);
      break;

    case "AWAITING_NEW_CATEGORY_NAME":
      await handleCustomCategoryName(chatId, text);
      break;

    case "AWAITING_CATEGORY":
    case "AWAITING_CONFIRMATION":
    case "AWAITING_NEW_CATEGORY_CONFIRM":
    case "AWAITING_NEW_CATEGORY_GROUP":
      // User is in the middle of a flow, but sent text instead of using buttons
      // Reset and process as new message
      await updateTelegramUser(chatId, "IDLE", {});
      await handleAIMessage(chatId, text, telegramUser.userId);
      break;

    case "IDLE":
    default:
      // Process with AI
      await handleAIMessage(chatId, text, telegramUser.userId);
  }
}

// Handle income confirmation
async function handleIncomeConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
  console.log("[handleIncomeConfirmation] Called with:", { chatId, confirmed, callbackQueryId });

  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (!telegramUser?.userId) {
    await answerCallbackQuery(callbackQueryId, "Erro: conta não conectada");
    return;
  }

  const context = telegramUser.context as TelegramConversationContext;
  console.log("[handleIncomeConfirmation] Context:", {
    pendingIncome: context.pendingIncome,
    scheduledTransactionId: context.scheduledTransactionId,
  });

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
    console.log("[handleIncomeConfirmation] Updating scheduled transaction:", context.scheduledTransactionId);
    // Update existing scheduled transaction
    await markTransactionAsPaid(
      context.scheduledTransactionId,
      context.pendingIncome.amount,
      context.pendingIncome.description || context.pendingIncome.incomeSourceName
    );
    transactionId = context.scheduledTransactionId;

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
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: budgetInfo.budget.id,
        accountId: budgetInfo.defaultAccount.id,
        incomeSourceId: context.pendingIncome.incomeSourceId,
        memberId: budgetInfo.member.id,
        type: "income",
        status: "cleared",
        amount: context.pendingIncome.amount,
        description: context.pendingIncome.description || context.pendingIncome.incomeSourceName,
        date: getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

    transactionId = newTransaction.id;

    await updateTelegramUser(chatId, "IDLE", {
      lastTransactionId: transactionId,
    });

    await sendMessage(
      chatId,
      `<b>Receita registrada!</b>\n\n` +
        (context.pendingIncome.incomeSourceName ? `Fonte: ${context.pendingIncome.incomeSourceName}\n` : "") +
        `Valor: ${formatCurrency(context.pendingIncome.amount)}\n` +
        (context.pendingIncome.description ? `Descrição: ${context.pendingIncome.description}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
  }
}

// Handle transfer confirmation
async function handleTransferConfirmation(chatId: number, confirmed: boolean, callbackQueryId: string) {
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
      description: context.pendingTransfer.description || "Transferencia via Telegram",
      date: getTodayNoonUTC(),
      source: "telegram",
    })
    .returning();

  await updateTelegramUser(chatId, "IDLE", {
    lastTransactionId: newTransaction.id,
  });

  // Get account names
  const fromAccount = budgetInfo.accounts.find((a) => a.id === context.pendingTransfer?.fromAccountId);
  const toAccount = budgetInfo.accounts.find((a) => a.id === context.pendingTransfer?.toAccountId);

  await sendMessage(
    chatId,
    `<b>Transferencia realizada!</b>\n\n` +
      `De: ${fromAccount?.name || "Conta"}\n` +
      `Para: ${toAccount?.name || "Conta"}\n` +
      `Valor: ${formatCurrency(context.pendingTransfer.amount)}\n\n` +
      `Use /desfazer para reverter.`
  );
}

// Handle new category: accept suggested name
async function handleNewCategoryAccept(chatId: number, callbackQueryId: string) {
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
async function handleNewCategoryRename(chatId: number, callbackQueryId: string) {
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
async function handleNewCategoryExisting(chatId: number, callbackQueryId: string) {
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
async function handleGroupSelection(chatId: number, groupId: string, callbackQueryId: string) {
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
  const [newTransaction] = await db
    .insert(transactions)
    .values({
      budgetId: budgetInfo.budget.id,
      accountId: budgetInfo.defaultAccount!.id,
      categoryId: newCategory.id,
      memberId: budgetInfo.member.id,
      type: "expense",
      status: "cleared",
      amount: context.pendingExpense.amount,
      description: context.pendingExpense.description,
      date: getTodayNoonUTC(),
      source: "telegram",
    })
    .returning();

  await updateTelegramUser(chatId, "IDLE", {
    lastTransactionId: newTransaction.id,
  });

  // Get group name
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));

  await sendMessage(
    chatId,
    `✅ <b>Categoria criada e gasto registrado!</b>\n\n` +
      `📁 Nova categoria: <b>${categoryName}</b>\n` +
      `📂 Grupo: ${group?.name || "—"}\n\n` +
      `💰 Valor: ${formatCurrency(context.pendingExpense.amount)}\n` +
      (context.pendingExpense.description ? `Descrição: ${context.pendingExpense.description}\n\n` : "\n") +
      `Use /desfazer para remover o gasto.`
  );
}

// Handle custom category name input
async function handleCustomCategoryName(chatId: number, text: string) {
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

// Main callback query handler
export async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  const data = query.data;

  console.log("[handleCallbackQuery] Received:", { chatId, data });

  if (!chatId || !data) return;

  // Get current context to determine what type of confirmation
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  const context = telegramUser?.context as TelegramConversationContext | undefined;
  console.log("[handleCallbackQuery] Context:", {
    currentStep: telegramUser?.currentStep,
    hasPendingIncome: !!context?.pendingIncome,
    hasPendingExpense: !!context?.pendingExpense,
    hasPendingTransfer: !!context?.pendingTransfer,
    scheduledTransactionId: context?.scheduledTransactionId,
  });

  if (data.startsWith("cat_")) {
    const categoryId = data.replace("cat_", "");
    await handleCategorySelection(chatId, categoryId, query.id);
  } else if (data.startsWith("group_")) {
    const groupId = data.replace("group_", "");
    await handleGroupSelection(chatId, groupId, query.id);
  } else if (data === "newcat_accept") {
    await handleNewCategoryAccept(chatId, query.id);
  } else if (data === "newcat_rename") {
    await handleNewCategoryRename(chatId, query.id);
  } else if (data === "newcat_existing") {
    await handleNewCategoryExisting(chatId, query.id);
  } else if (data.startsWith("income_")) {
    // Income source selection (if implemented)
    await answerCallbackQuery(query.id, "Fonte selecionada");
  } else if (data === "confirm") {
    // Determine what to confirm based on context
    if (context?.pendingIncome) {
      await handleIncomeConfirmation(chatId, true, query.id);
    } else if (context?.pendingTransfer) {
      await handleTransferConfirmation(chatId, true, query.id);
    } else {
      await handleConfirmation(chatId, true, query.id);
    }
  } else if (data === "cancel") {
    // Handle cancel for any pending operation
    if (context?.pendingIncome) {
      await handleIncomeConfirmation(chatId, false, query.id);
    } else if (context?.pendingTransfer) {
      await handleTransferConfirmation(chatId, false, query.id);
    } else {
      await handleConfirmation(chatId, false, query.id);
    }
  } else {
    await answerCallbackQuery(query.id, "Acao nao reconhecida");
  }
}
