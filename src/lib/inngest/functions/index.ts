import { generateRecurringTransactions } from "./generate-recurring-transactions";

export type InngestEvents = {
  // Add your events here
};

// Registered Inngest functions
export const functions = [
  generateRecurringTransactions,
];
