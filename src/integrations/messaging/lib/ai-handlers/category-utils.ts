/**
 * Category-related utilities for AI handlers
 */

import type { UserContext } from "../types";
import type { GroupCode } from "@/db/schema/groups";

type CategoryLike = UserContext["categories"][number];

/**
 * Get categories visible to this user.
 * In "private" mode, hides other members' personal categories AND personal groups.
 */
export function getVisibleCategories(userContext: UserContext): UserContext["categories"] {
  const { privacyMode, memberId, categories } = userContext;
  if (privacyMode === "private") {
    return categories.filter((c) => c.memberId == null || c.memberId === memberId);
  }
  return categories;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * When the matched category is shared (memberId = null), check whether the
 * sender has a personal category with the same name and prefer that. Honors
 * the user's explicit choice of creating a personal variant (e.g. "Vestuário"
 * inside "Gastos de Alison") to mark individual expenses without needing an
 * explicit scope hint in the message.
 */
export function preferSenderPersonalCategory(
  matched: CategoryLike,
  categories: CategoryLike[],
  senderMemberId: string,
): CategoryLike {
  if (matched.memberId != null) return matched;

  const target = normalize(matched.name);
  const personal = categories.find(
    (c) => c.memberId === senderMemberId && normalize(c.name) === target,
  );
  return personal ?? matched;
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
 * Suggest a group code based on the category hint.
 * Personal groups no longer have a fixed code — they are selected by the AI
 * handler using the member's personal group ID directly.
 * This function only returns global group codes.
 *
 * Preference order (per product decision): lifestyle > essential > investments
 * Entertainment/fun keywords previously mapped to "pleasures" now map to "lifestyle".
 */
export function suggestGroupForCategory(hint: string): GroupCode {
  const normalized = hint
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

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

  // Lifestyle: dining out, clothing, subscriptions, gym, personal care,
  // entertainment and hobbies (formerly "pleasures")
  const lifestyleKeywords = [
    // dining & food out
    "restaurante", "almoco", "janta", "lanche", "delivery", "ifood", "uber eats",
    // clothing & beauty
    "roupa", "vestuario", "calcado", "sapato", "tenis",
    "cabelo", "salao", "barbearia", "estetica", "cosmetico",
    // subscriptions & streaming
    "netflix", "spotify", "streaming", "assinatura", "amazon",
    // fitness
    "academia", "fitness", "esporte",
    // pets
    "pet", "cachorro", "gato", "veterinario",
    // entertainment & hobbies (formerly pleasures)
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

  if (essentialKeywords.some((kw) => normalized.includes(kw))) {
    return "essential";
  }
  if (lifestyleKeywords.some((kw) => normalized.includes(kw))) {
    return "lifestyle";
  }
  if (investmentKeywords.some((kw) => normalized.includes(kw))) {
    return "investments";
  }

  // Default to lifestyle for unknown categories
  return "lifestyle";
}
