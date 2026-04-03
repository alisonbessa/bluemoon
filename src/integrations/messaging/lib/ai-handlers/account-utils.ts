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
 * Display labels for payment methods with icons.
 * Used in confirmation and success messages to clearly show HOW the user paid.
 */
const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  pix: "📱 PIX",
  cartao_credito: "💳 Cartão de crédito",
  cartao_debito: "💳 Cartão de débito",
  boleto: "📄 Boleto",
  dinheiro: "💵 Dinheiro",
  transferencia: "🏦 Transferência",
};

/**
 * Get a display label for the payment method.
 * Resolves from: explicit paymentMethodHint > account type > accountHint keywords > null
 */
export function getPaymentMethodDisplayLabel(
  paymentMethodHint?: string,
  accountType?: string,
  accountHint?: string
): string | null {
  // 1. Explicit payment method from AI
  if (paymentMethodHint && PAYMENT_METHOD_DISPLAY[paymentMethodHint]) {
    return PAYMENT_METHOD_DISPLAY[paymentMethodHint];
  }

  // 2. Infer from account type
  if (accountType) {
    const typeMap: Record<string, string> = {
      credit_card: "💳 Cartão de crédito",
      checking: "🏦 Conta corrente",
      savings: "🐷 Poupança",
      cash: "💵 Dinheiro",
      benefit: "🍽️ Benefício",
      investment: "📈 Investimento",
    };
    if (typeMap[accountType]) return typeMap[accountType];
  }

  // 3. Infer from accountHint keywords
  if (accountHint) {
    const normalized = normalizeText(accountHint);
    if (normalized.includes("pix")) return PAYMENT_METHOD_DISPLAY.pix;
    if (normalized.includes("boleto")) return PAYMENT_METHOD_DISPLAY.boleto;
    if (normalized.includes("dinheiro") || normalized.includes("especie")) return PAYMENT_METHOD_DISPLAY.dinheiro;
    if (normalized.includes("debito")) return PAYMENT_METHOD_DISPLAY.cartao_debito;
    if (normalized.includes("credito") || normalized.includes("cartao")) return PAYMENT_METHOD_DISPLAY.cartao_credito;
    if (normalized.includes("transferencia") || normalized.includes("ted") || normalized.includes("doc")) return PAYMENT_METHOD_DISPLAY.transferencia;
  }

  return null;
}

/**
 * Suggest a default account type based on payment method hint and account hint.
 * Prioritizes paymentMethodHint (from AI) over keyword detection in the account name.
 */
export function suggestAccountTypeFromHint(accountHint: string, paymentMethodHint?: string): string {
  // 1. Use explicit payment method hint from AI (most reliable)
  if (paymentMethodHint) {
    const methodToType: Record<string, string> = {
      cartao_credito: "credit_card",
      cartao_debito: "checking",
      pix: "checking",
      boleto: "checking",
      dinheiro: "cash",
      transferencia: "checking",
    };
    if (methodToType[paymentMethodHint]) return methodToType[paymentMethodHint];
  }

  // 2. Fallback to keyword detection in the account name/hint
  const normalized = normalizeText(accountHint);
  if (normalized.includes("cartao") || normalized.includes("credito") || normalized.includes("credit")) return "credit_card";
  if (normalized.includes("debito") || normalized.includes("conta corrente") || normalized.includes("pix")) return "checking";
  if (normalized.includes("poupanca")) return "savings";
  if (normalized.includes("dinheiro") || normalized.includes("especie")) return "cash";
  if (normalized.includes("vr") || normalized.includes("va") || normalized.includes("flash") || normalized.includes("alelo") || normalized.includes("sodexo") || normalized.includes("ticket")) return "benefit";
  return "checking";
}

/**
 * Get a human-readable account type name in Portuguese
 */
export function getAccountTypeName(type: string): string {
  const names: Record<string, string> = {
    credit_card: "Cartão de crédito",
    checking: "Conta corrente",
    savings: "Poupança",
    cash: "Dinheiro",
    investment: "Investimento",
    benefit: "Benefício",
  };
  return names[type] || "Conta";
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
 * Get the field label for an account based on its type.
 * e.g. credit_card → "Cartão", checking → "Conta", cash → "Pagamento"
 */
export function getAccountFieldLabel(accountType?: string): string {
  switch (accountType) {
    case "credit_card": return "Cartão";
    case "checking": return "Conta";
    case "savings": return "Conta";
    case "cash": return "Pagamento";
    case "benefit": return "Benefício";
    case "investment": return "Conta";
    default: return "Pagamento";
  }
}

/**
 * Format account with icon only (no label prefix).
 * e.g. "💳 Nubank", "🏦 Itaú"
 * Use in contexts where a label is already provided (e.g. "De:", "Para:").
 */
export function formatAccountWithIcon(accountName: string, accountType?: string): string {
  const icon = accountType ? getAccountIcon(accountType) : "💰";
  return `${icon} ${accountName}`;
}

/**
 * Format account display for messages: "Label: emoji name"
 * e.g. "Cartão: 💳 Nubank", "Conta: 🏦 Itaú", "Pagamento: 💵 Dinheiro"
 */
export function formatAccountDisplay(accountName: string, accountType?: string): string {
  const icon = accountType ? getAccountIcon(accountType) : "💰";
  const label = getAccountFieldLabel(accountType);
  return `${label}: ${icon} ${accountName}`;
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
  const hintWords = normalizedHint.split(/\s+/).filter(w => w.length >= 2);
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
