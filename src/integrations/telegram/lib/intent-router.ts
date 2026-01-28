import type { AIResponse, UserContext, ExtractedExpenseData, ExtractedIncomeData, ExtractedQueryData, ExtractedTransferData } from "./types";
import { handleExpenseIntent, handleIncomeIntent, handleTransferIntent } from "./ai-handlers";
import { handleQueryIntent } from "./query-executor";
import { sendMessage } from "./bot";
import { logAIResponse } from "./ai-logger";

/**
 * Route the AI-parsed intent to the appropriate handler
 */
export async function routeIntent(
  chatId: number,
  aiResponse: AIResponse,
  userContext: UserContext,
  originalMessage: string,
  messagesToDelete: number[] = []
): Promise<string | null> {
  const { intent, confidence, data, requiresConfirmation } = aiResponse;

  // Log the AI response for analysis
  const logId = await logAIResponse(originalMessage, aiResponse, userContext);

  switch (intent) {
    case "REGISTER_EXPENSE":
      await handleExpenseIntent(
        chatId,
        data as ExtractedExpenseData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete
      );
      break;

    case "REGISTER_INCOME":
      await handleIncomeIntent(
        chatId,
        data as ExtractedIncomeData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete
      );
      break;

    case "QUERY_BALANCE":
    case "QUERY_CATEGORY":
    case "QUERY_GOAL":
    case "QUERY_ACCOUNT":
      await handleQueryIntent(
        chatId,
        intent,
        data as ExtractedQueryData,
        userContext
      );
      break;

    case "TRANSFER":
      await handleTransferIntent(
        chatId,
        data as ExtractedTransferData,
        confidence,
        requiresConfirmation,
        userContext,
        messagesToDelete
      );
      break;

    case "UNKNOWN":
    default:
      await handleUnknownIntent(chatId);
      break;
  }

  return logId;
}

/**
 * Handle unknown or unclear intents
 */
async function handleUnknownIntent(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    `Não entendi bem. Posso ajudar com:\n\n` +
      `<b>Registrar gastos:</b>\n` +
      `"gastei 50 no mercado"\n` +
      `"paguei 200 de luz"\n\n` +
      `<b>Registrar receitas:</b>\n` +
      `"recebi 5000 de salário"\n\n` +
      `<b>Consultas:</b>\n` +
      `"quanto gastei esse mês?"\n` +
      `"quanto sobrou em alimentação?"\n` +
      `"como está minha meta de viagem?"\n\n` +
      `Use /ajuda para mais detalhes.`
  );
}
