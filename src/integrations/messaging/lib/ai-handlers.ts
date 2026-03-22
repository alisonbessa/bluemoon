/**
 * AI Handlers - Backward compatibility re-export
 *
 * This file has been refactored into smaller modules under ./ai-handlers/.
 * It re-exports everything to maintain backward compatibility for existing imports.
 */

// Intent handlers
export { handleExpenseIntent } from "./ai-handlers/expense-handler";
export { handleIncomeIntent } from "./ai-handlers/income-handler";
export { handleTransferIntent } from "./ai-handlers/transfer-handler";

// Account utilities
export {
  getPaymentMethodLabel,
  getAccountIcon,
  normalizeText,
  detectAccountType,
  matchAccount,
  filterAccountsByHint,
  ACCOUNT_TYPE_ALIASES,
} from "./ai-handlers/account-utils";

// Category utilities
export {
  formatCategoryName,
  suggestGroupForCategory,
  getVisibleCategories,
} from "./ai-handlers/category-utils";
