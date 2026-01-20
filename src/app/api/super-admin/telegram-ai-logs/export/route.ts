import { NextResponse } from "next/server";
import { db } from "@/db";
import { telegramAILogs, categories } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";

interface TrainingExample {
  input: string;
  expectedIntent: string;
  expectedCategory?: string;
  originalAIIntent: string;
  wasCorrect: boolean;
}

// GET - Export training data for model improvement
export const GET = withSuperAdminAuthRequired(async () => {
  // Get all logs that have been resolved (either confirmed or corrected)
  const logs = await db
    .select({
      log: telegramAILogs,
      categoryName: categories.name,
    })
    .from(telegramAILogs)
    .leftJoin(categories, eq(telegramAILogs.correctedCategoryId, categories.id))
    .where(
      and(
        isNotNull(telegramAILogs.resolution),
        // Only include confirmed and corrected
        eq(telegramAILogs.resolution, "confirmed")
      )
    );

  const correctedLogs = await db
    .select({
      log: telegramAILogs,
      categoryName: categories.name,
    })
    .from(telegramAILogs)
    .leftJoin(categories, eq(telegramAILogs.correctedCategoryId, categories.id))
    .where(eq(telegramAILogs.resolution, "corrected"));

  // Build training examples
  const trainingExamples: TrainingExample[] = [];

  // Confirmed logs = AI was correct
  for (const { log } of logs) {
    const aiResponse = log.aiResponse as { intent: string; data?: Record<string, unknown> };
    trainingExamples.push({
      input: log.originalMessage,
      expectedIntent: aiResponse.intent,
      expectedCategory: (aiResponse.data?.categoryHint as string) || undefined,
      originalAIIntent: aiResponse.intent,
      wasCorrect: true,
    });
  }

  // Corrected logs = AI was wrong, use the corrected values
  for (const { log, categoryName } of correctedLogs) {
    const aiResponse = log.aiResponse as { intent: string };
    trainingExamples.push({
      input: log.originalMessage,
      expectedIntent: log.correctedIntent || aiResponse.intent,
      expectedCategory: categoryName || undefined,
      originalAIIntent: aiResponse.intent,
      wasCorrect: false,
    });
  }

  // Generate prompt improvement suggestions based on patterns
  const suggestions = generatePromptSuggestions(trainingExamples);

  // Format as prompt examples for Gemini
  const promptExamples = trainingExamples
    .filter((e) => !e.wasCorrect) // Focus on mistakes
    .map((e) => ({
      userMessage: e.input,
      correctOutput: {
        intent: e.expectedIntent,
        categoryHint: e.expectedCategory,
      },
      aiMistake: e.originalAIIntent,
    }));

  return NextResponse.json({
    totalExamples: trainingExamples.length,
    correctPredictions: trainingExamples.filter((e) => e.wasCorrect).length,
    incorrectPredictions: trainingExamples.filter((e) => !e.wasCorrect).length,
    accuracy:
      trainingExamples.length > 0
        ? (
            (trainingExamples.filter((e) => e.wasCorrect).length /
              trainingExamples.length) *
            100
          ).toFixed(1)
        : "N/A",
    suggestions,
    promptExamples: promptExamples.slice(0, 20), // Limit for readability
    allExamples: trainingExamples,
  });
});

function generatePromptSuggestions(examples: TrainingExample[]): string[] {
  const suggestions: string[] = [];
  const mistakes = examples.filter((e) => !e.wasCorrect);

  // Group mistakes by type
  const intentMistakes: Record<string, string[]> = {};

  for (const mistake of mistakes) {
    const key = `${mistake.originalAIIntent} -> ${mistake.expectedIntent}`;
    if (!intentMistakes[key]) {
      intentMistakes[key] = [];
    }
    intentMistakes[key].push(mistake.input);
  }

  // Generate suggestions based on patterns
  for (const [pattern, messages] of Object.entries(intentMistakes)) {
    if (messages.length >= 2) {
      const [from, to] = pattern.split(" -> ");
      suggestions.push(
        `AI confunde "${from}" com "${to}" em ${messages.length} casos. ` +
          `Exemplos: "${messages.slice(0, 3).join('", "')}"`
      );
    }
  }

  // Check for UNKNOWN intent issues
  const unknownMistakes = mistakes.filter(
    (m) => m.originalAIIntent === "UNKNOWN"
  );
  if (unknownMistakes.length > 0) {
    const commonWords = findCommonPatterns(unknownMistakes.map((m) => m.input));
    if (commonWords.length > 0) {
      suggestions.push(
        `AI nao reconhece mensagens com: ${commonWords.join(", ")}. ` +
          `Considere adicionar esses padroes ao prompt.`
      );
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("Nenhum padrao de erro significativo encontrado ainda.");
  }

  return suggestions;
}

function findCommonPatterns(messages: string[]): string[] {
  if (messages.length === 0) return [];

  // Simple word frequency analysis
  const wordFreq: Record<string, number> = {};

  for (const msg of messages) {
    const words = msg
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const uniqueWords = new Set(words);
    for (const word of uniqueWords) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Find words that appear in more than half the messages
  const threshold = Math.ceil(messages.length / 2);
  return Object.entries(wordFreq)
    .filter(([, count]) => count >= threshold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}
