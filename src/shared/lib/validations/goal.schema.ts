import { z } from "zod";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for creating a new goal
 */
export const createGoalSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  accountId: z.string().uuid("Invalid account ID"), // Account where goal savings are stored
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be less than 100 characters"),
  icon: z.string().max(10).optional(),
  color: z.string().max(10).optional(),
  targetAmount: z
    .number()
    .int("Amount must be in cents (integer)")
    .min(1, "Target amount must be at least 1 cent")
    .max(MAX_CENTS, "Amount exceeds maximum allowed"),
  initialAmount: z.number().int().min(0).max(MAX_CENTS).optional(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

/**
 * Schema for updating a goal
 */
export const updateGoalSchema = z.object({
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be less than 100 characters")
    .optional(),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().max(10).optional().nullable(),
  targetAmount: z.number().int().min(1).max(MAX_CENTS).optional(),
  targetDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.date())
    .optional()
    .nullable(),
  isCompleted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

/**
 * Schema for contributing to a goal
 */
export const goalContributionSchema = z.object({
  amount: z
    .number()
    .int("Amount must be in cents (integer)")
    .min(1, "Contribution amount must be at least 1 cent")
    .max(MAX_CENTS, "Amount exceeds maximum allowed"),
  description: z.string().max(255).optional(),
});

// Export inferred types
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
