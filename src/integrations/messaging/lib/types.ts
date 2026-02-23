// ============================================
// Messaging Adapter - Platform-agnostic interface
// ============================================

// Platform-agnostic identifiers (string for both Telegram and WhatsApp)
export type ChatId = string;
export type MessageId = string;
export type Platform = "telegram" | "whatsapp";

// Choice item for selection lists (categories, accounts, groups, etc.)
export interface Choice {
  id: string;
  label: string;
  description?: string;
}

export interface SendMessageOptions {
  parseMode?: "HTML" | "plain";
}

// The core adapter interface that each platform implements
export interface MessagingAdapter {
  readonly platform: Platform;

  // Send a text message
  sendMessage(chatId: ChatId, text: string, options?: SendMessageOptions): Promise<MessageId>;

  // Present a list of choices (categories, accounts, groups, income sources)
  // Telegram: inline keyboard rows of 2 + cancel
  // WhatsApp: buttons (<=3) or list (>3) + cancel
  // sectionTitle is used by WhatsApp lists (e.g. "Categorias", "Contas")
  sendChoiceList(chatId: ChatId, text: string, choices: Choice[], sectionTitle?: string): Promise<MessageId>;

  // Present a confirmation prompt (yes/no)
  sendConfirmation(chatId: ChatId, text: string): Promise<MessageId>;

  // Present a new category suggestion prompt
  // Telegram: 3-option keyboard (accept, rename, choose existing, cancel)
  // WhatsApp: buttons
  sendNewCategoryPrompt(chatId: ChatId, text: string, suggestedName: string): Promise<MessageId>;

  // Present a group selection list
  sendGroupList(chatId: ChatId, text: string, groups: Choice[]): Promise<MessageId>;

  // Delete messages by ID
  deleteMessages(chatId: ChatId, messageIds: MessageId[]): Promise<void>;

  // Acknowledge a button interaction (Telegram: answerCallbackQuery, WhatsApp: markAsRead)
  acknowledgeInteraction(interactionId: string): Promise<void>;

  // Update conversation state in the platform-specific DB table
  updateState(chatId: ChatId, step: ConversationStep, context: ConversationContext): Promise<void>;
}

// ============================================
// Conversation State Machine (shared between platforms)
// ============================================

export type ConversationStep =
  | "IDLE"
  | "AWAITING_VERIFICATION_CODE"
  | "AWAITING_AMOUNT"
  | "AWAITING_DESCRIPTION"
  | "AWAITING_CATEGORY"
  | "AWAITING_CONFIRMATION"
  | "AWAITING_INCOME_SOURCE"
  | "AWAITING_ACCOUNT"
  | "AWAITING_TRANSFER_DEST"
  | "AWAITING_NEW_CATEGORY_CONFIRM"
  | "AWAITING_NEW_CATEGORY_NAME"
  | "AWAITING_NEW_CATEGORY_GROUP";

export interface ConversationContext {
  pendingExpense?: {
    amount: number; // in cents
    description?: string;
    categoryId?: string;
    categoryName?: string;
    accountId?: string;
    accountName?: string;
    isInstallment?: boolean;
    totalInstallments?: number;
  };
  pendingIncome?: {
    amount: number;
    description?: string;
    incomeSourceId?: string;
    incomeSourceName?: string;
    accountId?: string;
  };
  pendingTransfer?: {
    amount: number;
    fromAccountId?: string;
    toAccountId?: string;
    description?: string;
  };
  pendingNewCategory?: {
    suggestedName: string;
    customName?: string;
    suggestedGroupId?: string;
    groupId?: string;
  };
  verificationCode?: string;
  verificationExpiry?: string;
  lastTransactionId?: string;
  lastQueryResult?: string;
  lastAILogId?: string;
  messagesToDelete?: string[];
  scheduledTransactionId?: string;
  createdAt?: string; // ISO timestamp for confirmation timeout
}

// ============================================
// AI Intent Types (platform-agnostic)
// ============================================

export type Intent =
  | "REGISTER_EXPENSE"
  | "REGISTER_INCOME"
  | "QUERY_BALANCE"
  | "QUERY_CATEGORY"
  | "QUERY_GOAL"
  | "QUERY_ACCOUNT"
  | "TRANSFER"
  | "GREETING"
  | "UNKNOWN";

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
  scope?: "individual" | "couple"; // "eu" vs "nós/casal/juntos"
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

export interface AIResponse {
  intent: Intent;
  confidence: number;
  data: ExtractedData;
  requiresConfirmation: boolean;
  suggestedResponse?: string;
}

// ============================================
// User Context (for AI parsing and business logic)
// ============================================

export interface PendingTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  categoryName?: string | null;
  incomeSourceName?: string | null;
}

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
    closingDay?: number | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  pendingTransactions: PendingTransaction[];
  defaultAccountId?: string;
  memberId: string;
}

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
    closingDay?: number | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  pendingTransactions: PendingTransaction[];
}
