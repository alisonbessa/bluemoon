import { z } from "zod";
import { incomeTypeEnum, incomeFrequencyEnum } from "@/db/schema/income-sources";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for creating a new income source
 */
export const createIncomeSourceSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  memberId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, "Income source name is required")
    .max(100, "Income source name must be less than 100 characters"),
  type: incomeTypeEnum.default("salary"),
  amount: z
    .number()
    .int("Amount must be in cents (integer)")
    .min(0, "Amount must be non-negative")
    .max(MAX_CENTS, "Amount exceeds maximum allowed"),
  frequency: incomeFrequencyEnum.default("monthly"),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  isAutoConfirm: z.boolean().optional().default(false),
});

/**
 * Schema for updating an income source
 */
export const updateIncomeSourceSchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  name: z
    .string()
    .min(1, "Income source name is required")
    .max(100, "Income source name must be less than 100 characters")
    .optional(),
  type: incomeTypeEnum.optional(),
  amount: z.number().int().min(0).max(MAX_CENTS).optional(),
  frequency: incomeFrequencyEnum.optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  isAutoConfirm: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

// Export inferred types
export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>;
export type UpdateIncomeSourceInput = z.infer<typeof updateIncomeSourceSchema>;
