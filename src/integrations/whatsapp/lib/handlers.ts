import { createLogger } from "@/shared/lib/logger";

// Per-phone message queue to prevent race conditions when user sends messages rapidly
const messageQueues = new Map<string, Promise<void>>();

function enqueueMessage(phoneNumber: string, handler: () => Promise<void>): Promise<void> {
  const current = messageQueues.get(phoneNumber) ?? Promise.resolve();
  const next = current.then(handler).catch((error) => {
    createLogger("whatsapp:queue").error("Queued message handler error:", { phoneNumber, error });
  });
  messageQueues.set(phoneNumber, next);
  return next;
}
import { db } from "@/db";
import { whatsappUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  ConversationStep,
  ConversationContext,
} from "@/integrations/messaging/lib/types";
import { WhatsAppAdapter } from "./whatsapp-adapter";
import { parseUserMessage } from "@/integrations/messaging/lib/gemini";
import { routeIntent } from "@/integrations/messaging/lib/intent-router";
import {
  getUserBudgetInfo,
  buildUserContext,
} from "@/integrations/messaging/lib/user-context";
import { markLogAsCancelled } from "@/integrations/messaging/lib/ai-logger";
import { handleVoiceMessage } from "./voice-handler";

import type { WhatsAppWebhookPayload } from "./whatsapp-types";
import {
  getOrCreateWhatsAppUser,
  isVerificationCode,
  handleVerificationCode,
  checkUserSubscriptionAccess,
} from "./user-management";
import {
  isCommand,
  handleHelp,
  handleBalance,
  handleCancel,
  handleUndo,
} from "./commands";
import {
  handleExpenseConfirmation,
  handleIncomeConfirmation,
  handleTransferConfirmation,
} from "./confirmations";
import {
  handleCategorySelection,
  handleAccountSelection,
  handleNewCategoryAccept,
  handleNewCategoryRename,
  handleNewCategoryExisting,
  handleCustomCategoryName,
  handleGroupSelection,
  handleNewAccountAccept,
  handleNewAccountExisting,
  handleClosingDay,
} from "./selections";

const logger = createLogger("whatsapp:handlers");
const adapter = new WhatsAppAdapter();

// ============================================
// AI Message Processing
// ============================================

async function handleAIMessage(
  phoneNumber: string,
  text: string,
  userId: string
): Promise<void> {
  const budgetInfo = await getUserBudgetInfo(userId);

  if (!budgetInfo || !budgetInfo.defaultAccount) {
    await adapter.sendMessage(
      phoneNumber,
      "Você precisa configurar seu orçamento primeiro no app.\n\n" +
        "Acesse hivebudget.com.br e complete a configuração."
    );
    return;
  }

  const userContext = buildUserContext(userId, budgetInfo);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const aiResponse = await parseUserMessage(text, userContext);
      await routeIntent(adapter, phoneNumber, aiResponse, userContext, text, []);
      return;
    } catch (error) {
      lastError = error;
      logger.warn(`AI processing error (attempt ${attempt}/3):`, { error: String(error) });
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  logger.error("AI processing failed after 3 attempts:", lastError);
  await adapter.sendMessage(
    phoneNumber,
    "Desculpe, tive um problema ao processar sua mensagem. Tente novamente em alguns segundos."
  );
}

// ============================================
// Interactive Response Handler (Button/List replies)
// ============================================

async function handleInteractiveResponse(
  phoneNumber: string,
  actionId: string,
  messageId: string
): Promise<void> {
  // Acknowledge the interaction (mark as read)
  try {
    await adapter.acknowledgeInteraction(messageId);
  } catch {
    // Non-critical, continue processing
  }

  // Get current user state
  const [waUser] = await db
    .select()
    .from(whatsappUsers)
    .where(eq(whatsappUsers.phoneNumber, phoneNumber));

  if (!waUser?.userId) {
    await adapter.sendMessage(
      phoneNumber,
      "Você precisa conectar sua conta primeiro."
    );
    return;
  }

  const context = (waUser.context || {}) as ConversationContext;
  const currentStep = waUser.currentStep as ConversationStep;

  // Handle cancel from any state
  if (actionId === "cancel") {
    if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);

    // Delete intermediate messages
    if (context.messagesToDelete && context.messagesToDelete.length > 0) {
      await adapter.deleteMessages(phoneNumber, context.messagesToDelete);
    }

    await adapter.updateState(phoneNumber, "IDLE", {});
    await adapter.sendMessage(phoneNumber, "Operação cancelada.");
    return;
  }

  // Check for confirmation timeout (15 minutes)
  if (context.createdAt) {
    const elapsed = Date.now() - new Date(context.createdAt).getTime();
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    if (elapsed > TIMEOUT_MS) {
      if (context.lastAILogId) await markLogAsCancelled(context.lastAILogId);
      await adapter.updateState(phoneNumber, "IDLE", {});
      let timeoutMsg = "⏰ Sua confirmação expirou (15 min).\n\n";
      if (context.pendingExpense) {
        const pe = context.pendingExpense as Record<string, unknown>;
        timeoutMsg += `Registro pendente: ${pe.categoryName || pe.description || "Despesa"}`;
        if (pe.amount) timeoutMsg += ` - R$ ${((pe.amount as number) / 100).toFixed(2).replace(".", ",")}`;
        timeoutMsg += "\n\n";
      } else if (context.pendingIncome) {
        const pi = context.pendingIncome as Record<string, unknown>;
        timeoutMsg += `Registro pendente: ${pi.incomeSourceName || pi.description || "Receita"}`;
        if (pi.amount) timeoutMsg += ` - R$ ${((pi.amount as number) / 100).toFixed(2).replace(".", ",")}`;
        timeoutMsg += "\n\n";
      }
      timeoutMsg += "Envie a mensagem novamente para registrar.";
      await adapter.sendMessage(phoneNumber, timeoutMsg);
      return;
    }
  }

  // Route based on action ID prefix and current step
  if (actionId.startsWith("cat_")) {
    const categoryId = actionId.replace("cat_", "");
    await handleCategorySelection(phoneNumber, categoryId);
    return;
  }

  if (actionId.startsWith("acc_")) {
    const accountId = actionId.replace("acc_", "");
    await handleAccountSelection(phoneNumber, accountId);
    return;
  }

  if (actionId.startsWith("group_")) {
    const groupId = actionId.replace("group_", "");
    await handleGroupSelection(phoneNumber, groupId);
    return;
  }

  if (actionId === "newcat_accept") {
    await handleNewCategoryAccept(phoneNumber);
    return;
  }

  if (actionId === "newcat_rename") {
    await handleNewCategoryRename(phoneNumber);
    return;
  }

  if (actionId === "newcat_existing") {
    await handleNewCategoryExisting(phoneNumber);
    return;
  }

  if (actionId === "newacc_accept") {
    await handleNewAccountAccept(phoneNumber);
    return;
  }

  if (actionId === "newacc_existing") {
    await handleNewAccountExisting(phoneNumber);
    return;
  }

  if (actionId === "confirm") {
    // Determine what to confirm based on context
    if (context.pendingIncome) {
      await handleIncomeConfirmation(phoneNumber, true);
    } else if (context.pendingTransfer) {
      await handleTransferConfirmation(phoneNumber, true);
    } else {
      await handleExpenseConfirmation(phoneNumber, true);
    }
    return;
  }

  // Unknown action
  logger.warn("Unknown interactive action:", { actionId, currentStep });
  await adapter.sendMessage(phoneNumber, "Ação não reconhecida. Tente novamente.");
}

// ============================================
// Text Message Handler
// ============================================

async function handleTextMessage(
  phoneNumber: string,
  text: string,
  displayName?: string
): Promise<void> {
  logger.info("handleTextMessage", { phoneNumber, text: text.slice(0, 50), displayName });
  const waUser = await getOrCreateWhatsAppUser(phoneNumber, displayName);
  logger.info("WhatsApp user state", { userId: waUser.userId, step: waUser.currentStep });

  // If user is not connected
  if (!waUser.userId) {
    // Check if text looks like a verification code
    if (isVerificationCode(text)) {
      const wasValidCode = await handleVerificationCode(phoneNumber, text);
      if (wasValidCode) {
        return;
      }
      // Code was invalid/expired - fall through to show connection instructions
    }

    const appUrl = process.env.NEXTAUTH_URL || "https://www.hivebudget.com";
    await adapter.sendMessage(
      phoneNumber,
      `Olá! Para usar o HiveBudget pelo WhatsApp, você precisa ter uma conta.\n\n` +
        `*Ainda não tem conta?*\n` +
        `Cadastre-se grátis: ${appUrl}/sign-up\n\n` +
        `*Já tem conta?*\n` +
        `1. Acesse ${appUrl}\n` +
        `2. Vá em Configurações > Conectar WhatsApp\n` +
        `3. Copie o código de 6 caracteres\n` +
        `4. Envie o código aqui neste chat\n\n` +
        `Aguardando seu código...`
    );
    return;
  }

  // User is connected - check if they have an active subscription
  const hasAccess = await checkUserSubscriptionAccess(waUser.userId);
  if (!hasAccess) {
    const appUrl = process.env.NEXTAUTH_URL || "https://www.hivebudget.com";
    await adapter.sendMessage(
      phoneNumber,
      `Sua assinatura do HiveBudget expirou.\n\n` +
        `Seus dados estão seguros no app, mas para continuar registrando pelo WhatsApp, ` +
        `é preciso reativar seu plano.\n\n` +
        `Reative em: ${appUrl}/app/choose-plan\n\n` +
        `Enquanto isso, você pode visualizar seus dados no app.`
    );
    return;
  }

  // User is connected - check for commands
  const command = isCommand(text);
  if (command) {
    switch (command) {
      case "ajuda":
        await handleHelp(phoneNumber);
        return;
      case "cancelar":
        await handleCancel(phoneNumber);
        return;
      case "desfazer":
        await handleUndo(phoneNumber);
        return;
      case "start":
        await handleHelp(phoneNumber);
        return;
      case "saldo":
        await handleBalance(phoneNumber);
        return;
    }
  }

  // Handle based on current conversation step
  const currentStep = waUser.currentStep as ConversationStep;

  switch (currentStep) {
    case "AWAITING_NEW_CATEGORY_NAME":
      await handleCustomCategoryName(phoneNumber, text);
      break;

    case "AWAITING_CLOSING_DAY":
      await handleClosingDay(phoneNumber, text);
      break;

    case "AWAITING_ACCOUNT":
    case "AWAITING_CATEGORY":
    case "AWAITING_CONFIRMATION":
    case "AWAITING_NEW_CATEGORY_CONFIRM":
    case "AWAITING_NEW_CATEGORY_GROUP":
    case "AWAITING_NEW_ACCOUNT_CONFIRM":
    case "AWAITING_INCOME_SOURCE":
    case "AWAITING_TRANSFER_DEST": {
      // User is in the middle of a flow but sent text instead of using buttons
      // Cancel the previous AI log before resetting
      const prevContext = (waUser.context || {}) as ConversationContext;
      if (prevContext.lastAILogId) {
        await markLogAsCancelled(prevContext.lastAILogId);
      }
      // Reset and process as new message
      await adapter.updateState(phoneNumber, "IDLE", {});
      await handleAIMessage(phoneNumber, text, waUser.userId);
      break;
    }

    case "IDLE":
    default:
      // Process with AI
      await handleAIMessage(phoneNumber, text, waUser.userId);
      break;
  }
}

// ============================================
// Top-Level Webhook Handler
// ============================================

export async function handleWebhook(
  payload: WhatsAppWebhookPayload
): Promise<void> {
  if (payload.object !== "whatsapp_business_account") {
    logger.warn("Unexpected webhook object:", payload.object);
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        // This might be a status update (delivery receipt, etc.)
        continue;
      }

      // Get contact info for display name
      const contacts = value.contacts;
      const contactMap = new Map<string, string>();
      if (contacts) {
        for (const contact of contacts) {
          contactMap.set(contact.wa_id, contact.profile.name);
        }
      }

      for (const message of messages) {
        const phoneNumber = message.from;
        const displayName = contactMap.get(message.from);

        try {
          switch (message.type) {
            case "text":
              if (message.text?.body) {
                const textBody = message.text.body.trim();
                // React with hourglass to indicate processing
                await adapter.reactToMessage(phoneNumber, message.id, "\u23F3");
                // Queue to prevent race conditions when user sends messages rapidly
                await enqueueMessage(phoneNumber, () =>
                  handleTextMessage(phoneNumber, textBody, displayName)
                );
                // Remove processing reaction when done
                await adapter.removeMessageReaction(phoneNumber, message.id);
              }
              break;

            case "interactive":
              if (message.interactive) {
                const actionId =
                  message.interactive.button_reply?.id ||
                  message.interactive.list_reply?.id;

                if (actionId) {
                  await handleInteractiveResponse(
                    phoneNumber,
                    actionId,
                    message.id
                  );
                }
              }
              break;

            case "audio":
              // Mark as read
              try {
                await adapter.acknowledgeInteraction(message.id);
              } catch {
                // Non-critical
              }

              // Check if user is connected
              {
                const waUser = await getOrCreateWhatsAppUser(phoneNumber, displayName);
                if (!waUser.userId) {
                  await adapter.sendMessage(
                    phoneNumber,
                    "Você precisa conectar sua conta primeiro para enviar áudios."
                  );
                  break;
                }

                // Check subscription before processing audio
                const hasAudioAccess = await checkUserSubscriptionAccess(waUser.userId);
                if (!hasAudioAccess) {
                  const appUrl = process.env.NEXTAUTH_URL || "https://www.hivebudget.com";
                  await adapter.sendMessage(
                    phoneNumber,
                    `Sua assinatura do HiveBudget expirou.\n\n` +
                      `Para continuar registrando pelo WhatsApp, reative seu plano em: ${appUrl}/app/choose-plan`
                  );
                  break;
                }

                if (message.audio?.id) {
                  const { transcription } =
                    await handleVoiceMessage(
                      adapter,
                      phoneNumber,
                      message.audio.id,
                      message.audio.mime_type
                    );

                  if (transcription) {
                    await handleAIMessage(phoneNumber, transcription, waUser.userId);
                  }
                }
              }
              break;

            case "image":
            case "video":
            case "document":
            case "sticker":
            case "location":
            case "contacts":
              // Mark as read
              try {
                await adapter.acknowledgeInteraction(message.id);
              } catch {
                // Non-critical
              }
              await adapter.sendMessage(
                phoneNumber,
                "Este tipo de mensagem ainda não é suportado. " +
                  "Por favor, envie uma mensagem de texto."
              );
              break;

            case "reaction":
              // Reactions don't need a response
              break;

            default:
              logger.warn("Unhandled message type:", { type: message.type });
              break;
          }
        } catch (error) {
          logger.error("Error processing WhatsApp message:", {
            phoneNumber,
            messageType: message.type,
            error,
          });

          try {
            await adapter.sendMessage(
              phoneNumber,
              "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente."
            );
          } catch {
            // Best-effort error notification
          }
        }
      }
    }
  }
}
