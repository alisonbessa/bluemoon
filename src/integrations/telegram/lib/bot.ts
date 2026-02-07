import type {
  TelegramSendMessageOptions,
  TelegramInlineKeyboardMarkup,
  TelegramFile,
} from "./types";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("telegram:bot");

// Re-export formatCurrency for convenience in telegram handlers
export { formatCurrency } from "@/shared/lib/formatters";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_API = "https://api.telegram.org/file/bot";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}

async function callTelegramApi<T>(method: string, body: object): Promise<T> {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.ok) {
    logger.error(`Telegram API error: ${method}`, data);
    throw new Error(data.description || "Telegram API error");
  }

  return data.result;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: TelegramInlineKeyboardMarkup;
  }
): Promise<number> {
  const body: TelegramSendMessageOptions = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || "HTML",
  };

  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  const result = await callTelegramApi<TelegramMessage>("sendMessage", body);
  return result.message_id;
}

/**
 * Delete a message from a chat
 */
export async function deleteMessage(chatId: number, messageId: number): Promise<boolean> {
  try {
    await callTelegramApi("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
    return true;
  } catch (error) {
    // Message might already be deleted or too old (>48h)
    logger.info(`Failed to delete message ${messageId}`, { error: String(error) });
    return false;
  }
}

/**
 * Delete multiple messages from a chat
 */
export async function deleteMessages(chatId: number, messageIds: number[]): Promise<void> {
  // Delete messages in parallel for speed
  await Promise.all(messageIds.map((id) => deleteMessage(chatId, id)));
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: TelegramInlineKeyboardMarkup;
  }
): Promise<void> {
  await callTelegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode || "HTML",
    reply_markup: options?.replyMarkup,
  });
}

// Create inline keyboard for category selection
export function createCategoryKeyboard(
  categories: Array<{ id: string; name: string; icon?: string | null }>
): TelegramInlineKeyboardMarkup {
  const buttons = categories.map((cat) => ({
    text: `${cat.icon || "📁"} ${cat.name}`,
    callback_data: `cat_${cat.id}`,
  }));

  // Organize in rows of 2
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  // Add cancel button
  rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

  return { inline_keyboard: rows };
}

// Create confirmation keyboard
export function createConfirmationKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirmar", callback_data: "confirm" },
        { text: "❌ Cancelar", callback_data: "cancel" },
      ],
    ],
  };
}

// Create income source selection keyboard
export function createIncomeSourceKeyboard(
  sources: Array<{ id: string; name: string }>
): TelegramInlineKeyboardMarkup {
  const buttons = sources.map((source) => ({
    text: source.name,
    callback_data: `income_${source.id}`,
  }));

  // Organize in rows of 2
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  // Add cancel button
  rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

  return { inline_keyboard: rows };
}

// Create keyboard for new category suggestion
export function createNewCategoryKeyboard(suggestedName: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: `✅ Criar "${suggestedName}"`, callback_data: "newcat_accept" },
      ],
      [
        { text: "✏️ Mudar nome", callback_data: "newcat_rename" },
        { text: "📁 Escolher existente", callback_data: "newcat_existing" },
      ],
      [
        { text: "❌ Cancelar", callback_data: "cancel" },
      ],
    ],
  };
}

// Create keyboard for group selection
export function createGroupKeyboard(
  groups: Array<{ id: string; name: string; icon?: string | null }>
): TelegramInlineKeyboardMarkup {
  const buttons = groups.map((group) => ({
    text: `${group.icon || "📁"} ${group.name}`,
    callback_data: `group_${group.id}`,
  }));

  // One group per row for clarity
  const rows = buttons.map((btn) => [btn]);

  // Add cancel button
  rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

  return { inline_keyboard: rows };
}

// Create keyboard for account selection
export function createAccountKeyboard(
  accounts: Array<{ id: string; name: string; type: string; icon?: string | null }>
): TelegramInlineKeyboardMarkup {
  // Get icon based on account type
  const getAccountIcon = (type: string, icon?: string | null) => {
    if (icon) return icon;
    switch (type) {
      case "credit_card": return "💳";
      case "checking": return "🏦";
      case "savings": return "🐷";
      case "benefit": return "🍽️";
      case "cash": return "💵";
      case "investment": return "📈";
      default: return "💰";
    }
  };

  const buttons = accounts.map((account) => ({
    text: `${getAccountIcon(account.type, account.icon)} ${account.name}`,
    callback_data: `acc_${account.id}`,
  }));

  // Organize in rows of 2
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  // Add cancel button
  rows.push([{ text: "❌ Cancelar", callback_data: "cancel" }]);

  return { inline_keyboard: rows };
}

// Create keyboard for adjustments after registration
export function createAdjustmentKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 Valor", callback_data: "adjust_amount" },
        { text: "📁 Categoria", callback_data: "adjust_category" },
        { text: "🏦 Conta", callback_data: "adjust_account" },
      ],
      [
        { text: "✅ OK", callback_data: "adjust_done" },
      ],
    ],
  };
}

// Get file info from Telegram
export async function getFile(fileId: string): Promise<TelegramFile> {
  return callTelegramApi<TelegramFile>("getFile", { file_id: fileId });
}

// Download file from Telegram servers
export async function downloadFile(filePath: string): Promise<Buffer> {
  const token = getBotToken();
  const url = `${TELEGRAM_FILE_API}${token}/${filePath}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
