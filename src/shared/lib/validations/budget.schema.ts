import { z } from "zod";

/**
 * Schema for creating a new budget
 */
export const createBudgetSchema = z.object({
  name: z
    .string()
    .min(1, "Budget name is required")
    .max(100, "Budget name must be less than 100 characters"),
  description: z.string().optional(),
  currency: z.string().default("BRL"),
});

/**
 * Schema for updating a budget
 */
export const updateBudgetSchema = z.object({
  name: z
    .string()
    .min(1, "Budget name is required")
    .max(100, "Budget name must be less than 100 characters")
    .optional(),
  description: z.string().optional().nullable(),
  currency: z.string().optional(),
});

// Export inferred types
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
