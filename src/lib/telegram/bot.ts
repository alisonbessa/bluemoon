import type {
  TelegramSendMessageOptions,
  TelegramInlineKeyboardMarkup,
} from "./types";

const TELEGRAM_API = "https://api.telegram.org/bot";

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
    console.error(`Telegram API error: ${method}`, data);
    throw new Error(data.description || "Telegram API error");
  }

  return data.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    replyMarkup?: TelegramInlineKeyboardMarkup;
  }
): Promise<void> {
  const body: TelegramSendMessageOptions = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || "HTML",
  };

  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  await callTelegramApi("sendMessage", body);
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

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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
