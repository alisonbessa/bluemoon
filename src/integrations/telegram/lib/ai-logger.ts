import { db } from "@/db";
import { telegramAILogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AIResponse, UserContext } from "./types";
import type { AILogResolution, StoredAIResponse, StoredUserContext } from "@/db/schema/telegram-ai-logs";
import { CONFIDENCE_THRESHOLDS } from "./gemini";

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
    console.error("[AILogger] Failed to log AI response:", error);
    return null;
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
    console.error("[AILogger] Failed to update resolution:", error);
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
 * Get statistics about AI performance
 */
export async function getAIPerformanceStats() {
  const logs = await db.select().from(telegramAILogs);

  const total = logs.length;
  const confirmed = logs.filter((l) => l.resolution === "confirmed").length;
  const corrected = logs.filter((l) => l.resolution === "corrected").length;
  const cancelled = logs.filter((l) => l.resolution === "cancelled").length;
  const unknown = logs.filter((l) => l.isUnknownIntent).length;
  const lowConfidence = logs.filter((l) => l.isLowConfidence).length;

  return {
    total,
    confirmed,
    corrected,
    cancelled,
    unknown,
    lowConfidence,
    accuracy: total > 0 ? ((confirmed / (confirmed + corrected)) * 100).toFixed(1) : "N/A",
  };
}
