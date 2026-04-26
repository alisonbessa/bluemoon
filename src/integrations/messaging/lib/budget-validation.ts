/**
 * Validation helpers for messaging handlers (WhatsApp, Telegram).
 *
 * Conversation context is mutated by AI parsers and selection menus, so we
 * cannot trust that the IDs flowing into a confirmation handler still belong
 * to the user's budget. These helpers re-check membership against the
 * BudgetInfo snapshot loaded for the current request.
 */

import type { BudgetInfo } from "./types";

interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Confirm that a category exists in the user's budget AND is usable by the
 * current member (shared categories are always usable; personal categories
 * must belong to the current user's member id).
 */
export function validateCategoryAccess(
  budgetInfo: BudgetInfo,
  categoryId: string | null | undefined
): ValidationResult {
  if (!categoryId) return { ok: true };
  const cat = budgetInfo.categories.find((c) => c.id === categoryId);
  if (!cat) {
    return { ok: false, error: "Categoria não encontrada neste orçamento." };
  }
  if (cat.memberId != null && cat.memberId !== budgetInfo.member.id) {
    return {
      ok: false,
      error: "Esta categoria pertence a outro membro do orçamento.",
    };
  }
  return { ok: true };
}

/**
 * Confirm that an account exists in the user's budget.
 */
export function validateAccountAccess(
  budgetInfo: BudgetInfo,
  accountId: string | null | undefined
): ValidationResult {
  if (!accountId) return { ok: true };
  const acc = budgetInfo.accounts.find((a) => a.id === accountId);
  if (!acc) {
    return { ok: false, error: "Conta não encontrada neste orçamento." };
  }
  return { ok: true };
}

/**
 * Confirm that an income source exists in the user's budget.
 */
export function validateIncomeSourceAccess(
  budgetInfo: BudgetInfo,
  incomeSourceId: string | null | undefined
): ValidationResult {
  if (!incomeSourceId) return { ok: true };
  const src = budgetInfo.incomeSources.find((s) => s.id === incomeSourceId);
  if (!src) {
    return { ok: false, error: "Fonte de renda não encontrada neste orçamento." };
  }
  return { ok: true };
}

/**
 * Validate every FK relevant to an expense before we hit the database.
 */
export function validateExpenseInputs(
  budgetInfo: BudgetInfo,
  params: { categoryId?: string | null; accountId?: string | null }
): ValidationResult {
  const acc = validateAccountAccess(budgetInfo, params.accountId);
  if (!acc.ok) return acc;
  return validateCategoryAccess(budgetInfo, params.categoryId);
}

/**
 * Validate every FK relevant to an income before we hit the database.
 */
export function validateIncomeInputs(
  budgetInfo: BudgetInfo,
  params: { incomeSourceId?: string | null; accountId?: string | null }
): ValidationResult {
  const acc = validateAccountAccess(budgetInfo, params.accountId);
  if (!acc.ok) return acc;
  return validateIncomeSourceAccess(budgetInfo, params.incomeSourceId);
}

/**
 * Validate transfer endpoints: both accounts must belong to the budget AND
 * be different from each other.
 */
export function validateTransferInputs(
  budgetInfo: BudgetInfo,
  params: { fromAccountId?: string | null; toAccountId?: string | null }
): ValidationResult {
  const from = validateAccountAccess(budgetInfo, params.fromAccountId);
  if (!from.ok) return from;
  const to = validateAccountAccess(budgetInfo, params.toAccountId);
  if (!to.ok) return to;
  if (
    params.fromAccountId &&
    params.toAccountId &&
    params.fromAccountId === params.toAccountId
  ) {
    return { ok: false, error: "Origem e destino devem ser contas diferentes." };
  }
  return { ok: true };
}
