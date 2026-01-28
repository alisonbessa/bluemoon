// Telegram Bot API Types

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
  photo?: TelegramPhotoSize[];
  caption?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramSendMessageOptions {
  chat_id: number;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: TelegramInlineKeyboardMarkup;
}

// AI Intent Types
export type Intent =
  | "REGISTER_EXPENSE"
  | "REGISTER_INCOME"
  | "QUERY_BALANCE"
  | "QUERY_CATEGORY"
  | "QUERY_GOAL"
  | "QUERY_ACCOUNT"
  | "TRANSFER"
  | "UNKNOWN";

// Extracted data from AI parsing
export interface ExtractedExpenseData {
  amount: number; // in cents
  description?: string;
  categoryHint?: string;
  accountHint?: string;
  date?: Date;
  isInstallment?: boolean;
  totalInstallments?: number;
}

export interface ExtractedIncomeData {
  amount: number;
  description?: string;
  incomeSourceHint?: string;
  accountHint?: string;
  date?: Date;
}

export interface ExtractedQueryData {
  queryType: "balance" | "category" | "goal" | "account";
  categoryName?: string;
  goalName?: string;
  accountName?: string;
  period?: "day" | "week" | "month" | "year";
}

export interface ExtractedTransferData {
  amount: number;
  fromAccountHint?: string;
  toAccountHint?: string;
  description?: string;
}

export type ExtractedData =
  | ExtractedExpenseData
  | ExtractedIncomeData
  | ExtractedQueryData
  | ExtractedTransferData
  | null;

// AI Response
export interface AIResponse {
  intent: Intent;
  confidence: number;
  data: ExtractedData;
  requiresConfirmation: boolean;
  suggestedResponse?: string;
}

// Pending transaction for context
export interface PendingTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  categoryName?: string | null;
  incomeSourceName?: string | null;
}

// User context for AI parsing
export interface UserContext {
  userId: string;
  budgetId: string;
  currentMonth: number;
  currentYear: number;
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    groupName?: string;
  }>;
  incomeSources: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  goals: Array<{
    id: string;
    name: string;
    icon?: string | null;
    targetAmount: number;
    currentAmount: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  pendingTransactions: PendingTransaction[];
  defaultAccountId?: string;
  memberId: string;
}

// Budget info returned from database queries
export interface BudgetInfo {
  budget: {
    id: string;
    name: string;
  };
  member: {
    id: string;
    userId: string;
  };
  defaultAccount?: {
    id: string;
    name: string;
    type: string;
  };
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    groupName?: string;
  }>;
  incomeSources: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  goals: Array<{
    id: string;
    name: string;
    icon?: string | null;
    targetAmount: number;
    currentAmount: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  pendingTransactions: PendingTransaction[];
}
