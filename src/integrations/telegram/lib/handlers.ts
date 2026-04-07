import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { telegramUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TelegramMessage, TelegramCallbackQuery } from "./types";
import type { TelegramConversationContext } from "@/db/schema/telegram-users";
import { getUserBudgetInfo, buildUserContext } from "@/integrations/messaging/lib/user-context";
import {
  sendMessage,
  answerCallbackQuery,
  deleteMessages,
} from "./bot";
import { parseUserMessage } from "./gemini";
import { routeIntent } from "./intent-router";
import { handleVoiceMessage, isValidAudioDuration, isValidAudioSize } from "./voice-handler";

// TODO: [Contribution Model] When implementing contribution model for Telegram:
// 1. Pass userContext (with privacyMode, contributionAmount) to query executor
// 2. Update balance responses to show contribution-based data for duo budgets
// 3. See messaging/lib/query-executor.ts for reference implementation

// Import from new modules
import {
  getOrCreateTelegramUser,
  updateTelegramUser,
  handleConnectionRequest,
  handleStart,
  isVerificationCode,
  handleVerificationCodeConnection,
} from "./user-management";
import {
  handleHelp,
  handleUndo,
  handleBalance,
  handleCancel,
  handleExpenseInput,
} from "./commands";
import {
  handleConfirmation,
  handleIncomeConfirmation,
  handleTransferConfirmation,
} from "./confirmations";
import {
  handleCategorySelection,
  handleAccountSelection,
  handleNewCategoryAccept,
  handleNewCategoryRename,
  handleNewCategoryExisting,
  handleGroupSelection,
  handleCustomCategoryName,
  handleNewAccountAccept,
  handleNewAccountExisting,
} from "./selections";

const logger = createLogger("telegram:handlers");

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
        "Acesse hivebudget.com e complete a configuração."
    );
    return;
  }

  // Build user context for AI
  const userContext = buildUserContext(userId, budgetInfo);

  try {
    // Parse message with AI
    const aiResponse = await parseUserMessage(text, userContext);

    // Route to appropriate handler
    await routeIntent(chatId, aiResponse, userContext, text, messagesToDelete);
  } catch (error) {
    logger.error("[Telegram] AI processing error:", error);
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
      case "/saldo":
      case "/resumo":
      case "/balance":
        await handleBalance(chatId);
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

  // Check if user is connected
  if (!telegramUser?.userId) {
    // User not connected - check if they're sending a verification code
    if (isVerificationCode(text)) {
      const wasValidCode = await handleVerificationCodeConnection(
        chatId,
        from.id,
        from.username,
        from.first_name,
        text
      );
      if (wasValidCode) {
        return; // Code was processed (valid or already connected)
      }
      // Code was invalid/expired - fall through to show connection instructions
    }

    const startAppUrl = process.env.NEXTAUTH_URL || "https://www.hivebudget.com";
    await sendMessage(
      chatId,
      "👋 Para usar o bot, você precisa conectar sua conta.\n\n" +
        "<b>Ainda não tem conta?</b>\n" +
        `Cadastre-se grátis: ${startAppUrl}/sign-up\n\n` +
        "<b>Já tem conta?</b>\n" +
        `1. Acesse ${startAppUrl}\n` +
        "2. Vá em Configurações > Conectar Telegram\n" +
        "3. Copie o código e envie aqui\n\n" +
        "Ou use /start para mais informações."
    );
    return;
  }

  // Handle based on current step
  switch (telegramUser.currentStep) {
    case "AWAITING_NEW_CATEGORY_NAME":
      await handleCustomCategoryName(chatId, text);
      break;

    case "AWAITING_ACCOUNT":
    case "AWAITING_CATEGORY":
    case "AWAITING_CONFIRMATION":
    case "AWAITING_NEW_CATEGORY_CONFIRM":
    case "AWAITING_NEW_CATEGORY_GROUP":
    case "AWAITING_NEW_ACCOUNT_CONFIRM":
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

// Main callback query handler
export async function handleCallbackQuery(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  const data = query.data;

  if (!chatId || !data) return;

  // Get current context to determine what type of confirmation
  const [telegramUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  const context = telegramUser?.context as TelegramConversationContext | undefined;

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
  } else if (data === "newacc_accept") {
    await handleNewAccountAccept(chatId, query.id);
  } else if (data === "newacc_existing") {
    await handleNewAccountExisting(chatId, query.id);
  } else if (data.startsWith("income_")) {
    // Income source selection (if implemented)
    await answerCallbackQuery(query.id, "Fonte selecionada");
  } else if (data.startsWith("acc_")) {
    const accountId = data.replace("acc_", "");
    await handleAccountSelection(chatId, accountId, query.id);
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
    await answerCallbackQuery(query.id, "Ação não reconhecida");
  }
}
