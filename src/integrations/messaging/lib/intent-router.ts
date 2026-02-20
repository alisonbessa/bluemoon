import type { AIResponse, UserContext, ExtractedExpenseData, ExtractedIncomeData, ExtractedQueryData, ExtractedTransferData, MessagingAdapter, ChatId, MessageId } from "./types";
import { handleExpenseIntent, handleIncomeIntent, handleTransferIntent } from "./ai-handlers";
import { handleQueryIntent } from "./query-executor";
import { logAIResponse, markLogAsConfirmed, updateAILogBotResponse } from "./ai-logger";

/**
 * Route the AI-parsed intent to the appropriate handler
 */
export async function routeIntent(
  adapter: MessagingAdapter,
  chatId: ChatId,
  aiResponse: AIResponse,
  userContext: UserContext,
  originalMessage: string,
  messagesToDelete: MessageId[] = []
): Promise<string | null> {
  const { intent, confidence, data, requiresConfirmation } = aiResponse;

  // Log the AI response for analysis
  const logId = await logAIResponse(originalMessage, aiResponse, userContext);

  switch (intent) {
    case "REGISTER_EXPENSE":
      await handleExpenseIntent(
        adapter,
        chatId,
        data as ExtractedExpenseData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete,
        logId
      );
      break;

    case "REGISTER_INCOME":
      await handleIncomeIntent(
        adapter,
        chatId,
        data as ExtractedIncomeData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete,
        logId
      );
      break;

    case "QUERY_BALANCE":
    case "QUERY_CATEGORY":
    case "QUERY_GOAL":
    case "QUERY_ACCOUNT":
      await handleQueryIntent(
        adapter,
        chatId,
        intent,
        data as ExtractedQueryData,
        userContext
      );
      // Queries are auto-confirmed (no user action needed)
      if (logId) await markLogAsConfirmed(logId);
      break;

    case "TRANSFER":
      await handleTransferIntent(
        adapter,
        chatId,
        data as ExtractedTransferData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete,
        logId
      );
      break;

    case "UNKNOWN":
    default:
      await handleUnknownIntent(adapter, chatId, logId);
      break;
  }

  return logId;
}

/**
 * Handle unknown or unclear intents
 */
async function handleUnknownIntent(adapter: MessagingAdapter, chatId: ChatId, logId: string | null): Promise<void> {
  const botMessage =
    `Nao entendi bem. Posso ajudar com:\n\n` +
    `<b>Registrar gastos:</b>\n` +
    `"gastei 50 no mercado"\n` +
    `"paguei 200 de luz"\n\n` +
    `<b>Registrar receitas:</b>\n` +
    `"recebi 5000 de salario"\n\n` +
    `<b>Consultas:</b>\n` +
    `"quanto gastei esse mes?"\n` +
    `"quanto sobrou em alimentacao?"\n` +
    `"como esta minha meta de viagem?"`;

  await adapter.sendMessage(chatId, botMessage);

  if (logId) {
    await updateAILogBotResponse(logId, botMessage);
  }
}
