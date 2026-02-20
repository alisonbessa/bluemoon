import { db } from "@/db";
import { whatsappUsers } from "@/db/schema";
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
import {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  markAsRead,
} from "./client";

// Strip HTML tags for WhatsApp (plain text only)
function stripHtml(text: string): string {
  return text
    .replace(/<b>/g, "*").replace(/<\/b>/g, "*")
    .replace(/<i>/g, "_").replace(/<\/i>/g, "_")
    .replace(/<code>/g, "```").replace(/<\/code>/g, "```")
    .replace(/<[^>]+>/g, "");
}

export class WhatsAppAdapter implements MessagingAdapter {
  readonly platform: Platform = "whatsapp";

  async sendMessage(chatId: ChatId, text: string, options?: SendMessageOptions): Promise<MessageId> {
    const plainText = options?.parseMode === "plain" ? text : stripHtml(text);
    return sendTextMessage(chatId, plainText);
  }

  async sendChoiceList(chatId: ChatId, text: string, choices: Choice[]): Promise<MessageId> {
    const plainText = stripHtml(text);

    // WhatsApp buttons: max 3 (+ we need a cancel button)
    // If choices <= 2, use buttons (2 choices + cancel = 3 buttons max)
    // Otherwise use a list
    if (choices.length <= 2) {
      const buttons = [
        ...choices.map((c) => ({ id: c.id, title: c.label.slice(0, 20) })),
        { id: "cancel", title: "Cancelar" },
      ];
      return sendButtonMessage(chatId, plainText, buttons);
    }

    // Use interactive list (max 10 rows)
    const rows = [
      ...choices.slice(0, 9).map((c) => ({
        id: c.id,
        title: c.label.slice(0, 24),
        description: c.description?.slice(0, 72),
      })),
      { id: "cancel", title: "Cancelar" },
    ];
    return sendListMessage(chatId, plainText, "Escolher", rows);
  }

  async sendConfirmation(chatId: ChatId, text: string): Promise<MessageId> {
    const plainText = stripHtml(text);
    return sendButtonMessage(chatId, plainText, [
      { id: "confirm", title: "Confirmar" },
      { id: "cancel", title: "Cancelar" },
    ]);
  }

  async sendNewCategoryPrompt(chatId: ChatId, text: string, suggestedName: string): Promise<MessageId> {
    const plainText = stripHtml(text);
    return sendButtonMessage(chatId, plainText, [
      { id: "newcat_accept", title: `Criar "${suggestedName}"`.slice(0, 20) },
      { id: "newcat_rename", title: "Mudar nome" },
      { id: "newcat_existing", title: "Escolher existente" },
    ]);
  }

  async sendGroupList(chatId: ChatId, text: string, groups: Choice[]): Promise<MessageId> {
    const plainText = stripHtml(text);

    if (groups.length <= 2) {
      const buttons = [
        ...groups.map((g) => ({ id: `group_${g.id}`, title: g.label.slice(0, 20) })),
        { id: "cancel", title: "Cancelar" },
      ];
      return sendButtonMessage(chatId, plainText, buttons);
    }

    const rows = [
      ...groups.slice(0, 9).map((g) => ({
        id: `group_${g.id}`,
        title: g.label.slice(0, 24),
      })),
      { id: "cancel", title: "Cancelar" },
    ];
    return sendListMessage(chatId, plainText, "Escolher grupo", rows);
  }

  async deleteMessages(_chatId: ChatId, _messageIds: MessageId[]): Promise<void> {
    // WhatsApp Cloud API does not support deleting messages
    // This is a no-op
  }

  async acknowledgeInteraction(interactionId: string): Promise<void> {
    await markAsRead(interactionId);
  }

  async updateState(chatId: ChatId, step: ConversationStep, context: ConversationContext): Promise<void> {
    await db
      .update(whatsappUsers)
      .set({
        currentStep: step,
        context,
        updatedAt: new Date(),
      })
      .where(eq(whatsappUsers.phoneNumber, chatId));
  }
}
