import { db } from "@/db";
import { telegramAILogs } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import type { AIResponse, UserContext } from "./types";
import type { AILogResolution, StoredAIResponse, StoredUserContext } from "@/db/schema/telegram-ai-logs";
import { CONFIDENCE_THRESHOLDS } from "./gemini";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("telegram:ai-logger");

/**
 * Log an AI response for analysis and model improvement
 */
export async function logAIResponse(
  originalMessage: string,
  aiResponse: AIResponse,
  userContext: UserContext,
  options?: {
    errorMessage?: string;
  }
): Promise<string | null> {
  try {
    const isLowConfidence = aiResponse.confidence < CONFIDENCE_THRESHOLDS.MEDIUM;
    const isUnknownIntent = aiResponse.intent === "UNKNOWN";

    // Simplify user context for storage
    const storedContext: StoredUserContext = {
      categoriesCount: userContext.categories.length,
      incomeSourcesCount: userContext.incomeSources.length,
      goalsCount: userContext.goals.length,
      accountsCount: userContext.accounts.length,
      hasDefaultAccount: !!userContext.defaultAccountId,
    };

    // Store AI response
    const storedResponse: StoredAIResponse = {
      intent: aiResponse.intent,
      confidence: aiResponse.confidence,
      data: aiResponse.data as Record<string, unknown> | null,
      requiresConfirmation: aiResponse.requiresConfirmation,
      suggestedResponse: aiResponse.suggestedResponse,
    };

    const [log] = await db
      .insert(telegramAILogs)
      .values({
        userId: userContext.userId,
        budgetId: userContext.budgetId,
        originalMessage,
        aiResponse: storedResponse,
        userContext: storedContext,
        isLowConfidence,
        isUnknownIntent,
        errorMessage: options?.errorMessage,
        resolution: isUnknownIntent ? "unknown_ignored" : "pending",
      })
      .returning();

    return log.id;
  } catch (error) {
    logger.error("[AILogger] Failed to log AI response:", error);
    return null;
  }
}

/**
 * Update the bot response text for a log entry
 */
export async function updateAILogBotResponse(
  logId: string,
  botResponse: string
): Promise<void> {
  try {
    await db
      .update(telegramAILogs)
      .set({ botResponse })
      .where(eq(telegramAILogs.id, logId));
  } catch (error) {
    logger.error("[AILogger] Failed to update bot response:", error);
  }
}

/**
 * Update the resolution of an AI log
 */
export async function updateAILogResolution(
  logId: string,
  resolution: AILogResolution,
  corrections?: {
    correctedIntent?: string;
    correctedCategoryId?: string;
    correctedAmount?: number;
  }
): Promise<void> {
  try {
    await db
      .update(telegramAILogs)
      .set({
        resolution,
        correctedIntent: corrections?.correctedIntent,
        correctedCategoryId: corrections?.correctedCategoryId,
        correctedAmount: corrections?.correctedAmount,
        resolvedAt: new Date(),
      })
      .where(eq(telegramAILogs.id, logId));
  } catch (error) {
    logger.error("[AILogger] Failed to update resolution:", error);
  }
}

/**
 * Mark log as confirmed (user accepted AI interpretation)
 */
export async function markLogAsConfirmed(logId: string): Promise<void> {
  await updateAILogResolution(logId, "confirmed");
}

/**
 * Mark log as corrected (user selected different option)
 */
export async function markLogAsCorrected(
  logId: string,
  corrections: {
    correctedIntent?: string;
    correctedCategoryId?: string;
    correctedAmount?: number;
  }
): Promise<void> {
  await updateAILogResolution(logId, "corrected", corrections);
}

/**
 * Mark log as cancelled
 */
export async function markLogAsCancelled(logId: string): Promise<void> {
  await updateAILogResolution(logId, "cancelled");
}

/**
 * Mark log as fallback (system used manual input)
 */
export async function markLogAsFallback(logId: string): Promise<void> {
  await updateAILogResolution(logId, "fallback");
}

/**
 * Get statistics about AI performance using SQL aggregation
 */
export async function getAIPerformanceStats() {
  const [stats] = await db
    .select({
      total: count(),
      confirmed: count(sql`CASE WHEN ${telegramAILogs.resolution} = 'confirmed' THEN 1 END`),
      corrected: count(sql`CASE WHEN ${telegramAILogs.resolution} = 'corrected' THEN 1 END`),
      cancelled: count(sql`CASE WHEN ${telegramAILogs.resolution} = 'cancelled' THEN 1 END`),
      unknown: count(sql`CASE WHEN ${telegramAILogs.isUnknownIntent} = true THEN 1 END`),
      lowConfidence: count(sql`CASE WHEN ${telegramAILogs.isLowConfidence} = true THEN 1 END`),
    })
    .from(telegramAILogs);

  const total = stats.total;
  const confirmed = stats.confirmed;
  const corrected = stats.corrected;

  return {
    total,
    confirmed,
    corrected,
    cancelled: stats.cancelled,
    unknown: stats.unknown,
    lowConfidence: stats.lowConfidence,
    accuracy: (confirmed + corrected) > 0
      ? ((confirmed / (confirmed + corrected)) * 100).toFixed(1)
      : "N/A",
  };
}
