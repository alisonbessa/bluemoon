// Re-export from shared messaging module
export {
  findMatchingScheduledTransaction,
  findMatchingScheduledIncome,
  findScheduledIncomeByHint,
  findScheduledExpenseByHint,
  markTransactionAsPaid,
} from "@/integrations/messaging/lib/transaction-matcher";
