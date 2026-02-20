import { db } from "@/db";
import { telegramUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  MessagingAdapter,
  ChatId,
  MessageId,
  Platform,
  SendMessageOptions,
  Choice,
  ConversationStep,
  ConversationContext,
} from "@/integrations/messaging/lib/types";
import type { TelegramConversationStep, TelegramConversationContext } from "@/db/schema/telegram-users";
import {
  sendMessage as telegramSendMessage,
  answerCallbackQuery,
  deleteMessages as telegramDeleteMessages,
  createCategoryKeyboard,
  createConfirmationKeyboard,
  createNewCategoryKeyboard,
  createGroupKeyboard,
  createAccountKeyboard,
} from "./bot";

// Helper to build a generic inline keyboard from Choice[]
function createChoiceKeyboard(choices: Choice[], callbackPrefix: string) {
  const buttons = choices.map((c) => ({
    text: c.label,
    callback_data: `${callbackPrefix}${c.id}`,
  }));

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

  return { inline_keyboard: rows };
}

// Convert shared ConversationContext to Telegram-specific format (string[] -> number[] for messagesToDelete)
function toTelegramContext(ctx: ConversationContext): TelegramConversationContext {
  return {
    ...ctx,
    messagesToDelete: ctx.messagesToDelete?.map((id) => parseInt(id, 10)),
  };
}

export class TelegramAdapter implements MessagingAdapter {
  readonly platform: Platform = "telegram";

  async sendMessage(chatId: ChatId, text: string, options?: SendMessageOptions): Promise<MessageId> {
    const numericChatId = parseInt(chatId, 10);
    const msgId = await telegramSendMessage(numericChatId, text, {
      parseMode: options?.parseMode === "plain" ? undefined : "HTML",
    });
    return String(msgId);
  }

  async sendChoiceList(chatId: ChatId, text: string, choices: Choice[]): Promise<MessageId> {
    const numericChatId = parseInt(chatId, 10);
    // Detect the prefix from the first choice's context
    const replyMarkup = createChoiceKeyboard(choices, "");
    const msgId = await telegramSendMessage(numericChatId, text, {
      parseMode: "HTML",
      replyMarkup,
    });
    return String(msgId);
  }

  async sendConfirmation(chatId: ChatId, text: string): Promise<MessageId> {
    const numericChatId = parseInt(chatId, 10);
    const msgId = await telegramSendMessage(numericChatId, text, {
      parseMode: "HTML",
      replyMarkup: createConfirmationKeyboard(),
    });
    return String(msgId);
  }

  async sendNewCategoryPrompt(chatId: ChatId, text: string, suggestedName: string): Promise<MessageId> {
    const numericChatId = parseInt(chatId, 10);
    const msgId = await telegramSendMessage(numericChatId, text, {
      parseMode: "HTML",
      replyMarkup: createNewCategoryKeyboard(suggestedName),
    });
    return String(msgId);
  }

  async sendGroupList(chatId: ChatId, text: string, groups: Choice[]): Promise<MessageId> {
    const numericChatId = parseInt(chatId, 10);
    const buttons = groups.map((g) => ({
      text: g.label,
      callback_data: `group_${g.id}`,
    }));
    const rows = buttons.map((btn) => [btn]);
    rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

    const msgId = await telegramSendMessage(numericChatId, text, {
      parseMode: "HTML",
      replyMarkup: { inline_keyboard: rows },
    });
    return String(msgId);
  }

  async deleteMessages(chatId: ChatId, messageIds: MessageId[]): Promise<void> {
    const numericChatId = parseInt(chatId, 10);
    const numericIds = messageIds.map((id) => parseInt(id, 10));
    await telegramDeleteMessages(numericChatId, numericIds);
  }

  async acknowledgeInteraction(interactionId: string): Promise<void> {
    await answerCallbackQuery(interactionId);
  }

  async updateState(chatId: ChatId, step: ConversationStep, context: ConversationContext): Promise<void> {
    const numericChatId = parseInt(chatId, 10);
    await db
      .update(telegramUsers)
      .set({
        currentStep: step as TelegramConversationStep,
        context: toTelegramContext(context),
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.chatId, numericChatId));
  }
}
