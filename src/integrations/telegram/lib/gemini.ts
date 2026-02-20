// Re-export from shared messaging module
export {
  CONFIDENCE_THRESHOLDS,
  parseUserMessage,
  transcribeAudio,
  matchCategory,
  matchIncomeSource,
  matchGoal,
  matchAccount,
} from "@/integrations/messaging/lib/gemini";
