import { db } from "@/db";
import { transactions, categories, incomeSources } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { ensurePendingTransactionsForMonth } from "@/lib/budget/pending-transactions";
import { getTodayNoonUTC } from "./telegram-utils";

interface ScheduledTransaction {
  id: string;
  amount: number;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  incomeSourceId: string | null;
  incomeSourceName: string | null;
  status: string;
  date: Date;
}

interface MatchResult {
  transaction: ScheduledTransaction;
  confidence: number;
}

/**
 * Normalize text for comparison: lowercase, remove accents, trim
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Extract significant words from text (removes common stopwords)
 */
function extractWords(text: string): string[] {
  const stopwords = new Set([
    "de", "da", "do", "das", "dos", "o", "a", "os", "as",
    "um", "uma", "uns", "umas", "e", "ou", "em", "no", "na",
    "nos", "nas", "para", "por", "com", "sem"
  ]);

  return normalizeText(text)
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopwords.has(word));
}

/**
 * Calculate word overlap score between two texts
 * Returns a score from 0 to 1 based on how many significant words match
 */
function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = extractWords(text1);
  const words2 = extractWords(text2);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  // Count matching words
  let matchCount = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      // Check for exact match or if one contains the other (for partial matches)
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchCount++;
        break;
      }
    }
  }

  // Calculate score: matched words / total unique significant words
  const totalUniqueWords = Math.max(words1.length, words2.length);
  return matchCount / totalUniqueWords;
}

/**
 * Find a matching scheduled/pending transaction
 * Used to update existing transactions instead of creating duplicates
 */
export async function findMatchingScheduledTransaction(
  budgetId: string,
  categoryId: string | null,
  amount: number,
  year: number,
  month: number
): Promise<MatchResult | null> {
  // Ensure pending transactions exist for this month (lazy generation)
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // Use UTC dates to avoid timezone issues
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  // Find pending transactions in this month
  const pendingTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      incomeSourceId: sql<string>`NULL`,
      incomeSourceName: sql<string>`NULL`,
      status: transactions.status,
      date: transactions.date,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        eq(transactions.status, "pending"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  if (pendingTransactions.length === 0) {
    return null;
  }

  // Find best match based on category and value
  let bestMatch: MatchResult | null = null;

  for (const tx of pendingTransactions) {
    let confidence = 0;

    // Category match (most important)
    if (categoryId && tx.categoryId === categoryId) {
      confidence += 0.5;
    }

    // Value match (with tolerance)
    const valueDiff = Math.abs(tx.amount - amount);
    const maxDiff = tx.amount * 0.3; // 30% tolerance

    if (valueDiff === 0) {
      confidence += 0.4; // Exact match
    } else if (valueDiff <= maxDiff) {
      // Proportional score based on how close the values are
      confidence += 0.4 * (1 - valueDiff / maxDiff);
    }

    // Boost if both category and value are close
    if (confidence > 0.6 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = {
        transaction: tx,
        confidence,
      };
    }
  }

  return bestMatch;
}

/**
 * Find matching scheduled income transaction
 */
export async function findMatchingScheduledIncome(
  budgetId: string,
  incomeSourceId: string | null,
  amount: number,
  year: number,
  month: number
): Promise<MatchResult | null> {
  // Ensure pending transactions exist for this month (lazy generation)
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // Use UTC dates to avoid timezone issues
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  const pendingIncome = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: sql<string>`NULL`,
      categoryName: sql<string>`NULL`,
      categoryIcon: sql<string>`NULL`,
      incomeSourceId: transactions.incomeSourceId,
      incomeSourceName: incomeSources.name,
      status: transactions.status,
      date: transactions.date,
    })
    .from(transactions)
    .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "income"),
        eq(transactions.status, "pending"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  if (pendingIncome.length === 0) {
    return null;
  }

  let bestMatch: MatchResult | null = null;

  for (const tx of pendingIncome) {
    let confidence = 0;

    // Income source match (most important)
    if (incomeSourceId && tx.incomeSourceId === incomeSourceId) {
      confidence += 0.5;
    }

    // Value match
    const valueDiff = Math.abs(tx.amount - amount);
    const maxDiff = tx.amount * 0.3;

    if (valueDiff === 0) {
      confidence += 0.4;
    } else if (valueDiff <= maxDiff) {
      confidence += 0.4 * (1 - valueDiff / maxDiff);
    }

    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = {
        transaction: tx,
        confidence,
      };
    }
  }

  return bestMatch;
}

/**
 * Find scheduled income by hint (when no amount is provided)
 * Matches by income source and/or description
 */
export async function findScheduledIncomeByHint(
  budgetId: string,
  incomeSourceId: string | null,
  descriptionHint: string | null,
  year: number,
  month: number
): Promise<MatchResult | null> {
  console.log("[findScheduledIncomeByHint] Called with:", {
    budgetId,
    incomeSourceId,
    descriptionHint,
    year,
    month,
  });

  // Ensure pending transactions exist for this month (lazy generation)
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // When searching by hint (without amount), we search ALL pending income transactions
  // regardless of date. This is because:
  // 1. The user is explicitly trying to mark a pending transaction as paid
  // 2. Scheduled transactions might be from previous months that weren't marked as paid yet
  // 3. The fuzzy matching on income source name is the primary filter
  const pendingIncome = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: sql<string>`NULL`,
      categoryName: sql<string>`NULL`,
      categoryIcon: sql<string>`NULL`,
      incomeSourceId: transactions.incomeSourceId,
      incomeSourceName: incomeSources.name,
      status: transactions.status,
      date: transactions.date,
    })
    .from(transactions)
    .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "income"),
        eq(transactions.status, "pending")
        // Note: No date filter - we want ALL pending income transactions
      )
    );

  console.log("[findScheduledIncomeByHint] Found pending income transactions:", pendingIncome.map(t => ({
    id: t.id,
    amount: t.amount,
    incomeSourceId: t.incomeSourceId,
    incomeSourceName: t.incomeSourceName,
    description: t.description,
    status: t.status,
  })));

  if (pendingIncome.length === 0) {
    console.log("[findScheduledIncomeByHint] No pending income found");
    return null;
  }

  // Calculate date range for current month to give priority
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  let bestMatch: MatchResult | null = null;

  for (const tx of pendingIncome) {
    let confidence = 0;

    // Income source match (highest priority)
    const sourceMatched = incomeSourceId && tx.incomeSourceId === incomeSourceId;
    if (sourceMatched) {
      confidence += 0.7;
    }

    // Date-based priority: boost confidence for transactions in the requested month
    const txDate = tx.date;
    const isCurrentMonth = txDate && txDate >= monthStart && txDate <= monthEnd;
    if (isCurrentMonth) {
      confidence += 0.2; // Boost for current month
    }

    // Description and source name match using word overlap
    if (descriptionHint) {
      // Compare with transaction description
      if (tx.description) {
        const descOverlap = calculateWordOverlap(descriptionHint, tx.description);
        if (descOverlap > 0.5) {
          confidence += 0.3 * descOverlap;
        }
      }

      // Compare with income source name (more important)
      if (tx.incomeSourceName) {
        const sourceOverlap = calculateWordOverlap(descriptionHint, tx.incomeSourceName);
        if (sourceOverlap > 0.3) {
          confidence += 0.5 * sourceOverlap;
        }
      }
    }

    console.log("[findScheduledIncomeByHint] Scoring transaction:", {
      id: tx.id,
      incomeSourceName: tx.incomeSourceName,
      sourceMatched,
      isCurrentMonth,
      confidence,
    });

    // If income source matched or description matched well, consider it
    if (confidence >= 0.4 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = {
        transaction: tx,
        confidence,
      };
      console.log("[findScheduledIncomeByHint] New best match:", tx.incomeSourceName, confidence);
    }
  }

  console.log("[findScheduledIncomeByHint] Final best match:", bestMatch ? { id: bestMatch.transaction.id, name: bestMatch.transaction.incomeSourceName, confidence: bestMatch.confidence } : null);
  return bestMatch;
}

/**
 * Find scheduled expense by hint (when no amount is provided)
 * Matches by category and/or description
 */
export async function findScheduledExpenseByHint(
  budgetId: string,
  categoryId: string | null,
  descriptionHint: string | null,
  year: number,
  month: number
): Promise<MatchResult | null> {
  // Ensure pending transactions exist for this month (lazy generation)
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // When searching by hint (without amount), we search ALL pending expense transactions
  // regardless of date. This is because:
  // 1. The user is explicitly trying to mark a pending transaction as paid
  // 2. Scheduled transactions might be from previous months that weren't marked as paid yet
  // 3. The fuzzy matching on category name is the primary filter
  const pendingExpenses = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      description: transactions.description,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      incomeSourceId: sql<string>`NULL`,
      incomeSourceName: sql<string>`NULL`,
      status: transactions.status,
      date: transactions.date,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        eq(transactions.status, "pending")
        // Note: No date filter - we want ALL pending expense transactions
      )
    );

  if (pendingExpenses.length === 0) {
    return null;
  }

  // Calculate date range for current month to give priority
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59));

  let bestMatch: MatchResult | null = null;

  for (const tx of pendingExpenses) {
    let confidence = 0;

    // Category match (highest priority)
    if (categoryId && tx.categoryId === categoryId) {
      confidence += 0.7;
    }

    // Date-based priority: boost confidence for transactions in the requested month
    const txDate = tx.date;
    const isCurrentMonth = txDate && txDate >= monthStart && txDate <= monthEnd;
    if (isCurrentMonth) {
      confidence += 0.2; // Boost for current month
    }

    // Description and category name match using word overlap
    if (descriptionHint) {
      // Compare with transaction description
      if (tx.description) {
        const descOverlap = calculateWordOverlap(descriptionHint, tx.description);
        if (descOverlap > 0.5) {
          confidence += 0.3 * descOverlap;
        }
      }

      // Compare with category name (more important)
      if (tx.categoryName) {
        const catOverlap = calculateWordOverlap(descriptionHint, tx.categoryName);
        if (catOverlap > 0.3) {
          confidence += 0.5 * catOverlap;
        }
      }
    }

    // If category matched or description matched well, consider it
    if (confidence >= 0.4 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = {
        transaction: tx,
        confidence,
      };
    }
  }

  return bestMatch;
}

/**
 * Update a scheduled transaction to mark it as paid
 */
export async function markTransactionAsPaid(
  transactionId: string,
  newAmount?: number,
  newDescription?: string
): Promise<void> {
  console.log("[markTransactionAsPaid] Called with:", {
    transactionId,
    newAmount,
    newDescription,
  });

  const updateData: Record<string, unknown> = {
    status: "cleared",
    date: getTodayNoonUTC(),
    updatedAt: new Date(),
    source: "telegram",
  };

  if (newAmount !== undefined) {
    updateData.amount = newAmount;
  }

  if (newDescription !== undefined) {
    // Remove "(agendado)" suffix from description
    updateData.description = newDescription.replace(/\s*\(agendado\)\s*$/i, "").trim();
  }

  console.log("[markTransactionAsPaid] Updating transaction with:", updateData);

  await db
    .update(transactions)
    .set(updateData)
    .where(eq(transactions.id, transactionId));

  console.log("[markTransactionAsPaid] Transaction updated successfully:", transactionId);
}
