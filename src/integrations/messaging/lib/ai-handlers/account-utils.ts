/**
 * Account-related utilities for AI handlers
 */

export const ACCOUNT_TYPE_ALIASES: Record<string, string[]> = {
  credit_card: ["cartao", "credito", "cartao de credito", "cartao de cred", "crédito"],
  checking: ["debito", "conta corrente", "corrente", "conta bancaria", "pix", "boleto"],
  savings: ["poupanca"],
  benefit: ["vr", "va", "flash", "alelo", "sodexo", "ticket", "beneficio", "vale"],
  cash: ["dinheiro", "especie"],
};

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Get a user-friendly label for a payment method hint.
 * e.g. "cartão" → "Qual cartão?", "pix" → "Qual conta para o Pix?"
 */
export function getPaymentMethodLabel(hint: string): string {
  const normalized = normalizeText(hint);
  if (normalized.includes("cartao") || normalized.includes("credito")) return "Qual cartão?";
  if (normalized.includes("pix")) return "Qual conta para o Pix?";
  if (normalized.includes("debito")) return "Qual conta?";
  if (normalized.includes("boleto")) return "Qual conta para o boleto?";
  return "Qual a forma de pagamento?";
}

/**
 * Get icon for account type
 */
export function getAccountIcon(type: string): string {
  switch (type) {
    case "credit_card": return "💳";
    case "checking": return "🏦";
    case "savings": return "🐷";
    case "benefit": return "🍽️";
    case "cash": return "💵";
    case "investment": return "📈";
    default: return "💰";
  }
}

/**
 * Detect which account type the hint refers to (generic match).
 * e.g. "cartão" → "credit_card", "pix" → "checking"
 */
export function detectAccountType(hint: string): string | null {
  const normalized = normalizeText(hint);
  for (const [type, aliases] of Object.entries(ACCOUNT_TYPE_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return type;
    }
  }
  return null;
}

/**
 * Match account from hint text.
 * 1. Exact/substring name match → single account
 * 2. Word-level name match → single account
 * 3. Type alias match → returns first if only one of that type
 * Returns null if no confident single match found.
 */
export function matchAccount(
  hint: string,
  accounts: Array<{ id: string; name: string; type: string }>
): { id: string; name: string } | null {
  if (!hint || accounts.length === 0) return null;

  const normalizedHint = normalizeText(hint);

  // 1. Direct name match (e.g., "flash" → "Flash", "nubank" → "Cartão Nubank")
  for (const account of accounts) {
    const normalizedName = normalizeText(account.name);
    if (
      normalizedName.includes(normalizedHint) ||
      normalizedHint.includes(normalizedName)
    ) {
      return { id: account.id, name: account.name };
    }
  }

  // 2. Word-level match
  const hintWords = normalizedHint.split(/\s+/).filter(w => w.length >= 3);
  for (const account of accounts) {
    const nameWords = normalizeText(account.name).split(/\s+/);
    if (hintWords.some(hw => nameWords.some(nw => nw.includes(hw) || hw.includes(nw)))) {
      return { id: account.id, name: account.name };
    }
  }

  // 3. Type alias match — only if there's exactly one account of that type
  const detectedType = detectAccountType(hint);
  if (detectedType) {
    const matchingAccounts = accounts.filter(a => a.type === detectedType);
    if (matchingAccounts.length === 1) {
      return { id: matchingAccounts[0].id, name: matchingAccounts[0].name };
    }
  }

  return null;
}

/**
 * Filter accounts by hint when exact match fails but we can narrow by type.
 * e.g. "cartão" + 2 credit cards → returns both credit cards
 * e.g. "pix" + 3 checking accounts → returns all checking accounts
 * Returns null if we can't narrow down (no type detected).
 */
export function filterAccountsByHint(
  hint: string,
  accounts: Array<{ id: string; name: string; type: string }>
): Array<{ id: string; name: string; type: string }> | null {
  if (!hint) return null;

  const detectedType = detectAccountType(hint);
  if (!detectedType) return null;

  const filtered = accounts.filter(a => a.type === detectedType);
  return filtered.length > 0 ? filtered : null;
}
