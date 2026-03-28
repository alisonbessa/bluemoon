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
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import { PLATFORM_KNOWLEDGE } from "@/integrations/web-chat/platform-knowledge";
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
// Gemini Context Cache for knowledge base
// ============================================

const HELP_MODEL = "models/gemini-2.5-flash";
const HELP_SYSTEM_INSTRUCTION = `Voce e o assistente do HiveBudget, uma plataforma de gestao financeira. Responda a pergunta do usuario com base EXCLUSIVAMENTE na documentacao fornecida. Seja conciso e direto.

REGRAS:
- Responda APENAS com base na documentacao fornecida
- Se a resposta NAO estiver na documentacao, responda exatamente: "NAO_ENCONTRADO"
- Seja amigavel e use linguagem simples
- Nao invente funcionalidades que nao existem
- Mantenha a resposta curta (maximo 3-4 paragrafos)
- Nao use markdown, apenas texto simples com quebras de linha`;

/** Cached Gemini context for the knowledge base (module-level singleton) */
let cachedContentName: string | null = null;
let cacheExpiresAt: number = 0;

/**
 * Get or create a Gemini cached content with the platform knowledge base.
 * The cache persists across requests (module-level) and auto-recreates on expiry.
 */
async function getOrCreateKnowledgeCache(apiKey: string): Promise<string | null> {
  // Return existing cache if still valid (with 5 min safety margin)
  if (cachedContentName && Date.now() < cacheExpiresAt - 5 * 60 * 1000) {
    return cachedContentName;
  }

  try {
    const cacheManager = new GoogleAICacheManager(apiKey);

    const cache = await cacheManager.create({
      model: HELP_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `DOCUMENTACAO DA PLATAFORMA:\n${PLATFORM_KNOWLEDGE}` }],
        },
      ],
      systemInstruction: HELP_SYSTEM_INSTRUCTION,
      ttlSeconds: 86400, // 24 hours
    });

    cachedContentName = cache.name!;
    // Parse expiry from cache response, or default to 23 hours from now
    cacheExpiresAt = cache.expireTime
      ? new Date(cache.expireTime).getTime()
      : Date.now() + 23 * 60 * 60 * 1000;

    logger.info(`Gemini knowledge cache created: ${cachedContentName}, expires: ${new Date(cacheExpiresAt).toISOString()}`);
    return cachedContentName;
  } catch (error) {
    logger.error("Failed to create Gemini knowledge cache:", error);
    return null;
  }
}

// ============================================
// Server-side response cache for help answers
// ============================================

const RESPONSE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RESPONSE_CACHE_SIZE = 200;

const responseCache = new Map<string, { answer: string | null; expiresAt: number }>();

function normalizeQuestion(q: string): string {
  return q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function getCachedResponse(question: string): string | null | undefined {
  const key = normalizeQuestion(question);
  const entry = responseCache.get(key);
  if (!entry) return undefined; // not in cache
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return undefined; // expired
  }
  return entry.answer; // may be null (meaning "not found" was cached)
}

function setCachedResponse(question: string, answer: string | null): void {
  // Evict oldest entries if cache is full
  if (responseCache.size >= MAX_RESPONSE_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  responseCache.set(normalizeQuestion(question), {
    answer,
    expiresAt: Date.now() + RESPONSE_CACHE_TTL,
  });
}

// ============================================
// Answer help questions (with dual caching)
// ============================================

/**
 * Answer a help/FAQ question using Gemini + platform knowledge base.
 * Uses two layers of caching:
 * 1. Server-side response cache (avoids API calls for repeated questions)
 * 2. Gemini context cache (90% discount on knowledge base tokens)
 * Falls back to sending full knowledge base if caching is unavailable.
 * Returns null if unable to answer (should suggest sending to human).
 */
async function answerHelpQuestion(question: string): Promise<string | null> {
  // Layer 1: Check server-side response cache
  const cached = getCachedResponse(question);
  if (cached !== undefined) {
    logger.info(`Help question cache hit: "${question.substring(0, 50)}..."`);
    return cached;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY not configured for help questions");
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let answer: string;

    // Layer 2: Try using Gemini context cache
    const cacheName = await getOrCreateKnowledgeCache(apiKey);

    if (cacheName) {
      // Use cached model (knowledge base is pre-loaded, only the question is sent)
      const cacheManager = new GoogleAICacheManager(apiKey);
      const cachedContent = await cacheManager.get(cacheName);
      const model = genAI.getGenerativeModelFromCachedContent(cachedContent, {
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      });
      const result = await model.generateContent(question);
      answer = result.response.text().trim();
    } else {
      // Fallback: send full knowledge base in prompt (no caching discount)
      logger.warn("Gemini cache unavailable, falling back to full prompt");
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      });
      const prompt = `${HELP_SYSTEM_INSTRUCTION}\n\nDOCUMENTACAO DA PLATAFORMA:\n${PLATFORM_KNOWLEDGE}\n\nPERGUNTA DO USUARIO: "${question}"\n\nRESPOSTA:`;
      const result = await model.generateContent(prompt);
      answer = result.response.text().trim();
    }

    const isNotFound = answer === "NAO_ENCONTRADO" || answer.includes("NAO_ENCONTRADO");
    const finalAnswer = isNotFound ? null : answer;

    // Store in response cache (including "not found" to avoid re-querying)
    setCachedResponse(question, finalAnswer);

    return finalAnswer;
  } catch (error) {
    logger.error("Error answering help question:", error);
    // If cache expired mid-request, clear it and retry once
    if (cachedContentName && String(error).includes("not found")) {
      cachedContentName = null;
      cacheExpiresAt = 0;
    }
    return null;
  }
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
      // Try answering as a help/FAQ question using the knowledge base
      const helpAnswer = await answerHelpQuestion(message);
      if (helpAnswer) {
        return successResponse({
          messages: [{ content: helpAnswer }],
        });
      }

      // Knowledge base couldn't answer - suggest sending to human
      return successResponse({
        messages: [{
          content: "Nao encontrei uma resposta para sua pergunta. Posso ajudar com registro de gastos, receitas e consultas financeiras.\n\nSe precisa de outro tipo de ajuda, que tal enviar essa mensagem para um humano?",
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
