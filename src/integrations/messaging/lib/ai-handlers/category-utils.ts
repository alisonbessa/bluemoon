/**
 * Category-related utilities for AI handlers
 */

import type { UserContext } from "../types";
import type { GroupCode } from "@/db/schema/groups";

/**
 * Get categories visible to this user (filters out other member's personal categories when private)
 */
export function getVisibleCategories(userContext: UserContext): UserContext["categories"] {
  const { privacyMode, memberId, categories } = userContext;
  if (privacyMode === "private") {
    return categories.filter((c) => c.memberId == null || c.memberId === memberId);
  }
  return categories;
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
