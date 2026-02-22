import { goals } from "@/db/schema";

/**
 * Calculate goal progress metrics.
 * Shared helper used by goal listing and contribution endpoints.
 */
export function calculateGoalMetrics(goal: typeof goals.$inferSelect) {
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const currentAmount = goal.currentAmount ?? 0;
  const targetAmount = goal.targetAmount;

  const progress = Math.min(
    Math.round((currentAmount / targetAmount) * 100),
    100
  );

  const monthsRemaining = Math.max(
    0,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
  );

  const remaining = targetAmount - currentAmount;
  const monthlyTarget =
    monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : remaining;

  return {
    progress,
    monthsRemaining,
    monthlyTarget,
    remaining,
  };
}
