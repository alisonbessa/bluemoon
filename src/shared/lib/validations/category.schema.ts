import { z } from "zod";
import { categoryBehaviorEnum } from "@/db/schema/categories";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  groupId: z.string().uuid("Invalid group ID"),
  memberId: z.string().uuid().optional(), // For personal "Prazeres" categories
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  icon: z.string().optional().nullable(),
  color: z.string().optional(),
  behavior: categoryBehaviorEnum.default("refill_up"),
  plannedAmount: z.number().int().min(0).max(MAX_CENTS).default(0),
  targetAmount: z.number().int().min(0).max(MAX_CENTS).optional(),
  targetDate: z.string().datetime().or(z.date()).optional(),
  suggestIcon: z.boolean().optional(), // If true, AI will suggest an emoji
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters")
    .optional(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  behavior: categoryBehaviorEnum.optional(),
  plannedAmount: z.number().int().min(0).max(MAX_CENTS).optional(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  targetAmount: z.number().int().min(0).max(MAX_CENTS).optional().nullable(),
  targetDate: z.string().datetime().or(z.date()).optional().nullable(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

// Export inferred types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
