import { db } from "@/db";
import { telegramUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TelegramConversationContext, TelegramConversationStep } from "@/db/schema/telegram-users";
import type { GroupCode } from "@/db/schema/groups";

/**
 * Update telegram user context
 */
export async function updateTelegramContext(
  chatId: number,
  step: TelegramConversationStep,
  context: TelegramConversationContext
): Promise<void> {
  await db
    .update(telegramUsers)
    .set({
      currentStep: step,
      context,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));
}

/**
 * Format category name (capitalize first letter of each word)
 */
export function formatCategoryName(hint: string): string {
  return hint
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Suggest a group code based on the category hint
 */
export function suggestGroupForCategory(hint: string): GroupCode {
  const normalized = hint
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Essential: bills, housing, groceries, health, education, transport
  const essentialKeywords = [
    "luz", "energia", "eletricidade", "agua", "gas", "internet", "telefone",
    "aluguel", "condominio", "iptu", "moradia", "casa", "apartamento",
    "mercado", "supermercado", "feira", "acougue", "padaria", "hortifruti",
    "saude", "farmacia", "remedio", "medico", "hospital", "plano de saude",
    "educacao", "escola", "faculdade", "curso", "material escolar",
    "transporte", "combustivel", "gasolina", "onibus", "metro", "pedagio",
    "seguro", "impostos", "banco", "tarifa",
  ];

  // Lifestyle: dining out, clothing, subscriptions, gym, personal care
  const lifestyleKeywords = [
    "restaurante", "almoco", "janta", "lanche", "delivery", "ifood", "uber eats",
    "roupa", "vestuario", "calcado", "sapato", "tenis",
    "netflix", "spotify", "streaming", "assinatura", "amazon",
    "academia", "fitness", "esporte",
    "cabelo", "salao", "barbearia", "estetica", "cosmetico",
    "pet", "cachorro", "gato", "veterinario",
  ];

  // Pleasures: entertainment, hobbies, fun
  const pleasuresKeywords = [
    "cinema", "teatro", "show", "evento", "festa",
    "bar", "cerveja", "bebida", "balada",
    "jogo", "game", "playstation", "xbox",
    "hobby", "livro", "revista",
    "viagem", "passeio", "turismo", "hotel",
  ];

  // Investments: savings, investments
  const investmentKeywords = [
    "investimento", "poupanca", "reserva", "emergencia",
    "previdencia", "aposentadoria", "tesouro", "acoes",
    "cdb", "lci", "lca", "fundo",
  ];

  // Check each group
  if (essentialKeywords.some((kw) => normalized.includes(kw))) {
    return "essential";
  }
  if (lifestyleKeywords.some((kw) => normalized.includes(kw))) {
    return "lifestyle";
  }
  if (pleasuresKeywords.some((kw) => normalized.includes(kw))) {
    return "pleasures";
  }
  if (investmentKeywords.some((kw) => normalized.includes(kw))) {
    return "investments";
  }

  // Default to lifestyle for unknown categories
  return "lifestyle";
}

/**
 * Match account from hint text
 * Returns the matched account or null if no match found
 */
export function matchAccount(
  hint: string,
  accounts: Array<{ id: string; name: string; type: string }>
): { id: string; name: string } | null {
  if (!hint || accounts.length === 0) return null;

  const normalizeText = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const normalizedHint = normalizeText(hint);

  // Direct name match (e.g., "flash" matches "Flash")
  for (const account of accounts) {
    const normalizedName = normalizeText(account.name);
    if (
      normalizedName.includes(normalizedHint) ||
      normalizedHint.includes(normalizedName)
    ) {
      return { id: account.id, name: account.name };
    }
  }

  // Common aliases for account types
  const aliases: Record<string, string[]> = {
    credit_card: ["cartao", "credito", "cartao de credito"],
    checking: ["debito", "conta corrente", "corrente"],
    savings: ["poupanca"],
    benefit: ["vr", "va", "flash", "alelo", "sodexo", "ticket", "beneficio"],
    cash: ["dinheiro", "especie"],
  };

  // Try matching by type aliases
  for (const account of accounts) {
    const typeAliases = aliases[account.type] || [];
    if (typeAliases.some((alias) => normalizedHint.includes(alias))) {
      return { id: account.id, name: account.name };
    }
  }

  return null;
}
