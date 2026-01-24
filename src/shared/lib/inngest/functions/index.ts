import { generateRecurringTransactions } from "./generate-recurring-transactions";
import { autoClearTransactions } from "./auto-clear-transactions";
import { sendWeeklyBillsSummary } from "./send-weekly-bills-summary";
import { sendMonthlyPlanningReminder } from "./send-monthly-planning-reminder";
import { sendTrialReminders } from "./send-trial-reminders";
import { sendInviteReminders } from "./send-invite-reminders";

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
];
