import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { transactions } from "@/db/schema/transactions";
import { z } from "zod";
import {
  successResponse,
  internalError,
  validationError,
} from "@/shared/lib/api/responses";
import {
  getUserBudgetInfo,
  buildUserContext,
} from "@/integrations/messaging/lib/user-context";
import {
  parseUserMessage,
  matchCategory,
  matchAccount,
  matchIncomeSource,
} from "@/integrations/messaging/lib/gemini";
import { handleQueryIntent } from "@/integrations/messaging/lib/query-executor";
import { formatCurrency } from "@/shared/lib/formatters";
import { getTodayNoonUTC } from "@/integrations/messaging/lib/utils";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import { getVisibleCategories } from "@/integrations/messaging/lib/ai-handlers/category-utils";
import type {
  MessagingAdapter,
  ChatId,
  MessageId,
  ConversationStep,
  ConversationContext,
  Choice,
  SendMessageOptions,
  ExtractedQueryData,
  ExtractedExpenseData,
  ExtractedIncomeData,
  ExtractedTransferData,
} from "@/integrations/messaging/lib/types";

const logger = createLogger("api:chat");

// ============================================
// Web Collector Adapter - collects messages instead of sending them
// ============================================

class WebCollectorAdapter implements MessagingAdapter {
  readonly platform = "web" as MessagingAdapter["platform"];
  collectedMessages: Array<{ type: string; text: string; choices?: Choice[] }> = [];

  async sendMessage(_chatId: ChatId, text: string, _options?: SendMessageOptions): Promise<MessageId> {
    this.collectedMessages.push({ type: "text", text });
    return String(this.collectedMessages.length);
  }

  async sendChoiceList(_chatId: ChatId, text: string, choices: Choice[], _sectionTitle?: string): Promise<MessageId> {
    this.collectedMessages.push({ type: "choices", text, choices });
    return String(this.collectedMessages.length);
  }

  async sendConfirmation(_chatId: ChatId, text: string): Promise<MessageId> {
    this.collectedMessages.push({ type: "confirmation", text });
    return String(this.collectedMessages.length);
  }

  async sendNewCategoryPrompt(_chatId: ChatId, text: string): Promise<MessageId> {
    this.collectedMessages.push({ type: "text", text });
    return String(this.collectedMessages.length);
  }

  async sendNewAccountPrompt(_chatId: ChatId, text: string): Promise<MessageId> {
    this.collectedMessages.push({ type: "text", text });
    return String(this.collectedMessages.length);
  }

  async sendGroupList(_chatId: ChatId, text: string, groups: Choice[]): Promise<MessageId> {
    this.collectedMessages.push({ type: "choices", text, choices: groups });
    return String(this.collectedMessages.length);
  }

  async deleteMessages(): Promise<void> {}
  async acknowledgeInteraction(): Promise<void> {}
  async updateState(): Promise<void> {}
}

// ============================================
// Request validation schemas
// ============================================

const messageRequestSchema = z.object({
  action: z.literal("message"),
  message: z.string().min(1).max(2000),
});

const confirmRequestSchema = z.object({
  action: z.literal("confirm"),
  pendingAction: z.object({
    type: z.enum(["expense", "income"]),
    data: z.record(z.unknown()),
  }),
});

const chatRequestSchema = z.discriminatedUnion("action", [
  messageRequestSchema,
  confirmRequestSchema,
]);

// ============================================
// Helpers
// ============================================

/** Convert HTML tags to plain text equivalents */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/g, "$1")
    .replace(/<i>(.*?)<\/i>/g, "$1")
    .replace(/<code>(.*?)<\/code>/g, "$1")
    .replace(/<[^>]+>/g, "");
}

// ============================================
// Main handler
// ============================================

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = await req.json();

    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data = parsed.data;

    if (data.action === "confirm") {
      return handleConfirm(session.user.id, data.pendingAction);
    }

    return handleMessage(session.user.id, data.message);
  } catch (error) {
    logger.error("Chat error:", error);
    return internalError("Erro ao processar mensagem");
  }
});

// ============================================
// Handle free-form message
// ============================================

async function handleMessage(userId: string, message: string) {
  const budgetInfo = await getUserBudgetInfo(userId);
  if (!budgetInfo) {
    return successResponse({
      messages: [{ content: "Você precisa configurar seu orçamento primeiro para usar o chat." }],
    });
  }

  const userContext = buildUserContext(userId, budgetInfo);
  const aiResponse = await parseUserMessage(message, userContext);
  const { intent, data, confidence } = aiResponse;

  switch (intent) {
    case "QUERY_BALANCE":
    case "QUERY_CATEGORY":
    case "QUERY_GOAL":
    case "QUERY_ACCOUNT": {
      const collector = new WebCollectorAdapter();
      await handleQueryIntent(collector, "web", intent, data as ExtractedQueryData, userContext);
      const messages = collector.collectedMessages.map((m) => ({
        content: htmlToPlainText(m.text),
      }));
      return successResponse({ messages });
    }

    case "REGISTER_EXPENSE": {
      return handleExpensePreview(data as ExtractedExpenseData, userContext);
    }

    case "REGISTER_INCOME": {
      return handleIncomePreview(data as ExtractedIncomeData, userContext);
    }

    case "TRANSFER": {
      const transferData = data as ExtractedTransferData;
      return successResponse({
        messages: [{
          content: `Transferências pelo chat ainda não são suportadas. Use o app para transferir${transferData.amount ? ` ${formatCurrency(transferData.amount)}` : ""}.`,
        }],
      });
    }

    case "GREETING": {
      return successResponse({
        messages: [{
          content: "Olá! Posso ajudar com:\n\n" +
            "- Registrar gastos: \"gastei 50 no mercado\"\n" +
            "- Registrar receitas: \"recebi 5000 de salario\"\n" +
            "- Consultar saldo: \"quanto gastei esse mes?\"\n" +
            "- Consultar categoria: \"quanto sobrou em alimentacao?\"\n" +
            "- Consultar metas: \"como esta minha meta?\"\n\n" +
            "O que deseja fazer?",
        }],
      });
    }

    default: {
      return successResponse({
        messages: [{
          content: "Desculpe, nao consegui entender sua mensagem. Posso ajudar com registro de gastos, receitas e consultas financeiras.\n\nSe precisa de outro tipo de ajuda, que tal enviar essa mensagem para um humano?",
          suggestHuman: true,
        }],
      });
    }
  }
}

// ============================================
// Build expense preview for confirmation
// ============================================

async function handleExpensePreview(data: ExtractedExpenseData, userContext: {
  budgetId: string;
  memberId: string;
  defaultAccountId?: string;
  accounts: Array<{ id: string; name: string; type: string; closingDay?: number | null }>;
  categories: Array<{ id: string; name: string; icon?: string | null; groupName?: string; memberId?: string | null }>;
  privacyMode?: string;
}) {
  const visibleCategories = getVisibleCategories(userContext as any);

  if (!data.amount) {
    return successResponse({
      messages: [{ content: "Qual o valor do gasto? Exemplo: \"gastei 50 no mercado\"" }],
    });
  }

  // Match category
  let categoryId: string | undefined;
  let categoryName: string | undefined;
  if (data.categoryHint) {
    const match = matchCategory(data.categoryHint, visibleCategories);
    if (match) {
      categoryId = match.category.id;
      categoryName = match.category.name;
    }
  }

  // Match account
  let accountId = userContext.defaultAccountId;
  let accountName: string | undefined;
  if (data.accountHint) {
    const match = matchAccount(data.accountHint, userContext.accounts);
    if (match) {
      accountId = match.account.id;
      accountName = match.account.name;
    }
  }
  if (!accountName && accountId) {
    accountName = userContext.accounts.find((a) => a.id === accountId)?.name;
  }

  if (!accountId) {
    return successResponse({
      messages: [{ content: "Voce precisa configurar uma conta padrao no app primeiro." }],
    });
  }

  const description = capitalizeFirst(data.description) || undefined;

  // Build confirmation summary
  let summary = `Registrar gasto de ${formatCurrency(data.amount)}`;
  if (description) summary += ` - ${description}`;
  if (categoryName) summary += ` (${categoryName})`;
  if (accountName) summary += ` na conta ${accountName}`;
  if (data.isInstallment && data.totalInstallments) {
    summary += ` em ${data.totalInstallments}x`;
  }
  summary += "?";

  return successResponse({
    messages: [{ content: summary }],
    pendingAction: {
      type: "expense" as const,
      data: {
        amount: data.amount,
        description,
        categoryId,
        categoryName,
        accountId,
        accountName,
        budgetId: userContext.budgetId,
        memberId: userContext.memberId,
        isInstallment: data.isInstallment || false,
        totalInstallments: data.totalInstallments,
        date: data.date ? data.date.toISOString() : null,
      },
    },
  });
}

// ============================================
// Build income preview for confirmation
// ============================================

async function handleIncomePreview(data: ExtractedIncomeData, userContext: {
  budgetId: string;
  memberId: string;
  defaultAccountId?: string;
  accounts: Array<{ id: string; name: string; type: string }>;
  incomeSources: Array<{ id: string; name: string; type: string }>;
}) {
  if (!data.amount) {
    return successResponse({
      messages: [{ content: "Qual o valor da receita? Exemplo: \"recebi 5000 de salario\"" }],
    });
  }

  // Match income source
  let incomeSourceId: string | undefined;
  let incomeSourceName: string | undefined;
  if (data.incomeSourceHint) {
    const match = matchIncomeSource(data.incomeSourceHint, userContext.incomeSources);
    if (match) {
      incomeSourceId = match.incomeSource.id;
      incomeSourceName = match.incomeSource.name;
    }
  }

  // Match account
  let accountId = userContext.defaultAccountId;
  let accountName: string | undefined;
  if (data.accountHint) {
    const match = matchAccount(data.accountHint, userContext.accounts);
    if (match) {
      accountId = match.account.id;
      accountName = match.account.name;
    }
  }
  if (!accountName && accountId) {
    accountName = userContext.accounts.find((a) => a.id === accountId)?.name;
  }

  if (!accountId) {
    return successResponse({
      messages: [{ content: "Voce precisa configurar uma conta padrao no app primeiro." }],
    });
  }

  const description = capitalizeFirst(data.description) || undefined;

  let summary = `Registrar receita de ${formatCurrency(data.amount)}`;
  if (incomeSourceName) summary += ` - ${incomeSourceName}`;
  if (description && description !== incomeSourceName) summary += ` (${description})`;
  if (accountName) summary += ` na conta ${accountName}`;
  summary += "?";

  return successResponse({
    messages: [{ content: summary }],
    pendingAction: {
      type: "income" as const,
      data: {
        amount: data.amount,
        description: description || incomeSourceName,
        incomeSourceId,
        incomeSourceName,
        accountId,
        accountName,
        budgetId: userContext.budgetId,
        memberId: userContext.memberId,
        date: data.date ? data.date.toISOString() : null,
      },
    },
  });
}

// ============================================
// Handle confirmed operation
// ============================================

async function handleConfirm(
  userId: string,
  pendingAction: { type: "expense" | "income"; data: Record<string, unknown> }
) {
  const { type, data } = pendingAction;

  // Verify the user owns the budget
  const budgetInfo = await getUserBudgetInfo(userId);
  if (!budgetInfo || budgetInfo.budget.id !== data.budgetId) {
    return successResponse({
      messages: [{ content: "Erro de autorizacao. Tente novamente." }],
    });
  }

  if (type === "expense") {
    return confirmExpense(data, budgetInfo.member.id);
  }

  if (type === "income") {
    return confirmIncome(data, budgetInfo.member.id);
  }

  return successResponse({
    messages: [{ content: "Acao invalida." }],
  });
}

async function confirmExpense(data: Record<string, unknown>, memberId: string) {
  try {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      return successResponse({ messages: [{ content: "Valor invalido." }] });
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: data.budgetId as string,
        accountId: data.accountId as string,
        categoryId: (data.categoryId as string) || null,
        memberId,
        type: "expense",
        status: "cleared",
        amount,
        description: (data.description as string) || null,
        date: data.date ? new Date(data.date as string) : getTodayNoonUTC(),
        isInstallment: (data.isInstallment as boolean) || false,
        totalInstallments: (data.totalInstallments as number) || null,
        installmentNumber: (data.isInstallment as boolean) ? 1 : null,
        source: "web_chat",
      })
      .returning();

    logger.info(`Expense created via chat: ${newTransaction.id} by member ${memberId}`);

    return successResponse({
      messages: [{
        content: `Gasto registrado com sucesso!\n\n` +
          `Valor: ${formatCurrency(amount)}\n` +
          (data.description ? `Descricao: ${data.description}\n` : "") +
          (data.categoryName ? `Categoria: ${data.categoryName}\n` : "") +
          (data.accountName ? `Conta: ${data.accountName}` : ""),
      }],
      completed: true,
    });
  } catch (error) {
    logger.error("Error confirming expense:", error);
    return successResponse({
      messages: [{ content: "Erro ao registrar gasto. Tente novamente." }],
    });
  }
}

async function confirmIncome(data: Record<string, unknown>, memberId: string) {
  try {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      return successResponse({ messages: [{ content: "Valor invalido." }] });
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId: data.budgetId as string,
        accountId: data.accountId as string,
        incomeSourceId: (data.incomeSourceId as string) || null,
        memberId,
        type: "income",
        status: "cleared",
        amount,
        description: (data.description as string) || null,
        date: data.date ? new Date(data.date as string) : getTodayNoonUTC(),
        source: "web_chat",
      })
      .returning();

    logger.info(`Income created via chat: ${newTransaction.id} by member ${memberId}`);

    return successResponse({
      messages: [{
        content: `Receita registrada com sucesso!\n\n` +
          `Valor: ${formatCurrency(amount)}\n` +
          (data.incomeSourceName ? `Fonte: ${data.incomeSourceName}\n` : "") +
          (data.accountName ? `Conta: ${data.accountName}` : ""),
      }],
      completed: true,
    });
  } catch (error) {
    logger.error("Error confirming income:", error);
    return successResponse({
      messages: [{ content: "Erro ao registrar receita. Tente novamente." }],
    });
  }
}
