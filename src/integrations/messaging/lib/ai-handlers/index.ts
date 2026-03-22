/**
 * AI Handlers - Re-exports from focused modules
 *
 * This barrel file maintains backward compatibility so that
 * imports from "./ai-handlers" or "./ai-handlers/index" continue to work.
 */

// Intent handlers
export { handleExpenseIntent } from "./expense-handler";
export { handleIncomeIntent } from "./income-handler";
export { handleTransferIntent } from "./transfer-handler";

// Account utilities
export {
  getPaymentMethodLabel,
  getAccountIcon,
  normalizeText,
  detectAccountType,
  matchAccount,
  filterAccountsByHint,
  ACCOUNT_TYPE_ALIASES,
} from "./account-utils";

// Category utilities
export {
  formatCategoryName,
  suggestGroupForCategory,
  getVisibleCategories,
} from "./category-utils";
