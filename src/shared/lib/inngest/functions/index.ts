import { generateRecurringTransactions } from "./generate-recurring-transactions";
import { autoClearTransactions } from "./auto-clear-transactions";
import { sendWeeklyBillsSummary } from "./send-weekly-bills-summary";
import { sendMonthlyPlanningReminder } from "./send-monthly-planning-reminder";
import { sendTrialReminders } from "./send-trial-reminders";
import { sendInviteReminders } from "./send-invite-reminders";
import { autoPayCreditCards } from "./auto-pay-credit-cards";
import { generateClosingDayBills } from "./generate-closing-day-bills";
import { pruneChatLogs } from "./prune-chat-logs";
import { runRetentionCampaigns } from "./run-retention-campaigns";
import { checkBudgetThresholds } from "./check-budget-thresholds";

export type InngestEvents = {
  // Add your events here
};

// Registered Inngest functions
export const functions = [
  generateRecurringTransactions,
  autoClearTransactions,
  sendWeeklyBillsSummary,
  sendMonthlyPlanningReminder,
  sendTrialReminders,
  sendInviteReminders,
  autoPayCreditCards,
  generateClosingDayBills,
  pruneChatLogs,
  runRetentionCampaigns,
  checkBudgetThresholds,
];
