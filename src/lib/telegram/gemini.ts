import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildParsePrompt, buildTranscriptionPrompt } from "./prompts";
import type { AIResponse, UserContext, Intent, ExtractedData } from "./types";

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85, // Auto-save without confirmation
  MEDIUM: 0.6, // Save with confirmation
  LOW: 0.6, // Ask for clarification
};

/**
 * Parse a user message using Gemini AI to extract intent and data
 */
export async function parseUserMessage(
  message: string,
  userContext: UserContext
): Promise<AIResponse> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent parsing
        maxOutputTokens: 1024,
      },
    });

    const prompt = buildParsePrompt(message, userContext);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Gemini] No JSON found in response:", responseText);
      return createUnknownResponse();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize response
    return normalizeAIResponse(parsed);
  } catch (error) {
    console.error("[Gemini] Error parsing message:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("[Gemini] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"),
      });
    }
    return createUnknownResponse();
  }
}

/**
 * Transcribe audio using Gemini
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/ogg"
): Promise<string> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBuffer.toString("base64"),
        },
      },
      buildTranscriptionPrompt(),
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error("[Gemini] Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Normalize AI response to ensure consistent structure
 */
function normalizeAIResponse(parsed: Record<string, unknown>): AIResponse {
  const intent = normalizeIntent(parsed.intent as string);
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
  const data = normalizeExtractedData(
    intent,
    parsed.data as Record<string, unknown>
  );

  // Determine if confirmation is needed based on confidence
  const requiresConfirmation = confidence < CONFIDENCE_THRESHOLDS.HIGH;

  return {
    intent,
    confidence,
    data,
    requiresConfirmation,
    suggestedResponse: parsed.suggestedResponse as string | undefined,
  };
}

/**
 * Normalize intent string to valid Intent type
 */
function normalizeIntent(intent: string | undefined): Intent {
  const validIntents: Intent[] = [
    "REGISTER_EXPENSE",
    "REGISTER_INCOME",
    "QUERY_BALANCE",
    "QUERY_CATEGORY",
    "QUERY_GOAL",
    "TRANSFER",
    "UNKNOWN",
  ];

  const normalized = (intent || "").toUpperCase().replace(/-/g, "_");
  return validIntents.includes(normalized as Intent)
    ? (normalized as Intent)
    : "UNKNOWN";
}

/**
 * Normalize extracted data based on intent
 */
function normalizeExtractedData(
  intent: Intent,
  data: Record<string, unknown> | undefined
): ExtractedData | null {
  if (!data) return null;

  switch (intent) {
    case "REGISTER_EXPENSE":
      return {
        amount: normalizeAmount(data.amount),
        description: data.description as string | undefined,
        categoryHint: data.categoryHint as string | undefined,
        accountHint: data.accountHint as string | undefined,
        date: data.date ? new Date(data.date as string) : undefined,
        isInstallment: data.isInstallment === true,
        totalInstallments: normalizeInstallments(data.totalInstallments),
      };

    case "REGISTER_INCOME":
      return {
        amount: normalizeAmount(data.amount),
        description: data.description as string | undefined,
        incomeSourceHint: data.incomeSourceHint as string | undefined,
        accountHint: data.accountHint as string | undefined,
        date: data.date ? new Date(data.date as string) : undefined,
      };

    case "QUERY_BALANCE":
    case "QUERY_CATEGORY":
    case "QUERY_GOAL":
      return {
        queryType: normalizeQueryType(data.queryType as string),
        categoryName: data.categoryName as string | undefined,
        goalName: data.goalName as string | undefined,
        period: normalizePeriod(data.period as string),
      };

    case "TRANSFER":
      return {
        amount: normalizeAmount(data.amount),
        fromAccountHint: data.fromAccountHint as string | undefined,
        toAccountHint: data.toAccountHint as string | undefined,
        description: data.description as string | undefined,
      };

    default:
      return null;
  }
}

/**
 * Normalize amount to cents (integer)
 * The AI is instructed to return values in REAIS, so we always convert to cents
 */
function normalizeAmount(amount: unknown): number {
  if (typeof amount === "number" && amount > 0) {
    // Always convert from reais to cents
    return Math.round(amount * 100);
  }
  return 0;
}

/**
 * Normalize installment count (2-24 range)
 */
function normalizeInstallments(installments: unknown): number | undefined {
  if (typeof installments === "number" && installments >= 2 && installments <= 24) {
    return Math.round(installments);
  }
  return undefined;
}

/**
 * Normalize query type
 */
function normalizeQueryType(
  queryType: string | undefined
): "balance" | "category" | "goal" | "account" {
  const valid = ["balance", "category", "goal", "account"];
  return valid.includes(queryType || "")
    ? (queryType as "balance" | "category" | "goal" | "account")
    : "balance";
}

/**
 * Normalize period
 */
function normalizePeriod(
  period: string | undefined
): "day" | "week" | "month" | "year" {
  const valid = ["day", "week", "month", "year"];
  return valid.includes(period || "")
    ? (period as "day" | "week" | "month" | "year")
    : "month";
}

/**
 * Create a default unknown response
 */
function createUnknownResponse(): AIResponse {
  return {
    intent: "UNKNOWN",
    confidence: 0,
    data: null,
    requiresConfirmation: false,
  };
}

/**
 * Fuzzy match a category from hint text
 */
export function matchCategory(
  hint: string | undefined,
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    groupName?: string;
  }>
): { category: (typeof categories)[number]; confidence: number } | null {
  if (!hint || categories.length === 0) return null;

  const normalized = normalizeText(hint);

  // Try exact match first
  const exactMatch = categories.find(
    (c) => normalizeText(c.name) === normalized
  );
  if (exactMatch) {
    return { category: exactMatch, confidence: 1.0 };
  }

  // Try partial match (contains)
  const partialMatch = categories.find(
    (c) =>
      normalizeText(c.name).includes(normalized) ||
      normalized.includes(normalizeText(c.name))
  );
  if (partialMatch) {
    return { category: partialMatch, confidence: 0.8 };
  }

  // Try common aliases
  const aliasMatch = matchByAlias(normalized, categories);
  if (aliasMatch) {
    return aliasMatch;
  }

  // Try group name match
  const groupMatch = categories.find(
    (c) => c.groupName && normalizeText(c.groupName).includes(normalized)
  );
  if (groupMatch) {
    return { category: groupMatch, confidence: 0.6 };
  }

  return null;
}

/**
 * Match category by common aliases
 */
function matchByAlias(
  hint: string,
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    groupName?: string;
  }>
): { category: (typeof categories)[number]; confidence: number } | null {
  const aliases: Record<string, string[]> = {
    // Food & Groceries
    mercado: ["supermercado", "compras", "alimentacao", "comida", "feira"],
    supermercado: ["mercado", "compras", "alimentacao", "comida"],
    alimentacao: ["mercado", "supermercado", "comida", "restaurante", "lanche"],
    restaurante: ["almoco", "janta", "lanche", "delivery", "ifood", "comida"],
    lanche: ["cafe", "padaria", "salgado", "doce"],

    // Bills
    luz: ["energia", "eletricidade", "conta de luz", "enel", "light"],
    energia: ["luz", "eletricidade", "conta de luz"],
    agua: ["saneamento", "conta de agua", "sabesp", "cedae"],
    internet: ["wifi", "banda larga", "net", "claro", "vivo"],
    telefone: ["celular", "tim", "claro", "vivo", "oi"],
    aluguel: ["moradia", "casa", "apartamento", "condominio"],

    // Transport
    transporte: ["uber", "99", "onibus", "metro", "gasolina", "combustivel"],
    uber: ["99", "taxi", "corrida", "transporte"],
    gasolina: ["combustivel", "alcool", "posto", "abastecimento"],

    // Health
    saude: [
      "farmacia",
      "remedio",
      "medico",
      "consulta",
      "exame",
      "plano de saude",
    ],
    farmacia: ["remedio", "medicamento", "drogaria"],

    // Education
    educacao: ["escola", "faculdade", "curso", "livro", "material escolar"],

    // Entertainment
    lazer: [
      "entretenimento",
      "diversao",
      "cinema",
      "netflix",
      "spotify",
      "streaming",
    ],
    assinatura: ["netflix", "spotify", "streaming", "subscricao"],
  };

  for (const [key, values] of Object.entries(aliases)) {
    if (hint.includes(key) || values.some((v) => hint.includes(v))) {
      // Find a category that matches the key or any alias
      const allTerms = [key, ...values];
      const match = categories.find((c) => {
        const catName = normalizeText(c.name);
        return allTerms.some(
          (term) => catName.includes(term) || term.includes(catName)
        );
      });
      if (match) {
        return { category: match, confidence: 0.7 };
      }
    }
  }

  return null;
}

/**
 * Match income source from hint text
 */
export function matchIncomeSource(
  hint: string | undefined,
  incomeSources: Array<{ id: string; name: string; type: string }>
): { incomeSource: (typeof incomeSources)[number]; confidence: number } | null {
  if (!hint || incomeSources.length === 0) return null;

  const normalized = normalizeText(hint);

  // Try exact match
  const exactMatch = incomeSources.find(
    (s) => normalizeText(s.name) === normalized
  );
  if (exactMatch) {
    return { incomeSource: exactMatch, confidence: 1.0 };
  }

  // Try partial match
  const partialMatch = incomeSources.find(
    (s) =>
      normalizeText(s.name).includes(normalized) ||
      normalized.includes(normalizeText(s.name))
  );
  if (partialMatch) {
    return { incomeSource: partialMatch, confidence: 0.8 };
  }

  // Try type match
  const typeAliases: Record<string, string[]> = {
    salary: ["salario", "pagamento", "holerite", "contracheque"],
    benefit: ["vr", "va", "vale refeicao", "vale alimentacao", "beneficio"],
    freelance: ["freelance", "autonomo", "servico", "trabalho extra", "bico"],
    rental: ["aluguel", "inquilino", "locacao"],
    investment: ["rendimento", "dividendo", "juros", "investimento"],
  };

  for (const source of incomeSources) {
    const aliases = typeAliases[source.type] || [];
    if (aliases.some((a) => normalized.includes(a))) {
      return { incomeSource: source, confidence: 0.7 };
    }
  }

  return null;
}

/**
 * Match goal from hint text
 */
export function matchGoal<
  T extends { id: string; name: string; icon?: string | null },
>(
  hint: string | undefined,
  goals: T[]
): { goal: T; confidence: number } | null {
  if (!hint || goals.length === 0) return null;

  const normalized = normalizeText(hint);

  // Try exact match
  const exactMatch = goals.find((g) => normalizeText(g.name) === normalized);
  if (exactMatch) {
    return { goal: exactMatch, confidence: 1.0 };
  }

  // Try partial match
  const partialMatch = goals.find(
    (g) =>
      normalizeText(g.name).includes(normalized) ||
      normalized.includes(normalizeText(g.name))
  );
  if (partialMatch) {
    return { goal: partialMatch, confidence: 0.8 };
  }

  // Try word-by-word match
  const words = normalized.split(/\s+/);
  const wordMatch = goals.find((g) => {
    const goalWords = normalizeText(g.name).split(/\s+/);
    return words.some((w) =>
      goalWords.some((gw) => gw.includes(w) || w.includes(gw))
    );
  });
  if (wordMatch) {
    return { goal: wordMatch, confidence: 0.6 };
  }

  return null;
}

/**
 * Normalize text for comparison (remove accents, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
