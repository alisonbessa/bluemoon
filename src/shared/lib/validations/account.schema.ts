import { z } from "zod";
import { accountTypeEnum } from "@/db/schema/accounts";

// Max value in cents (R$ 10,000,000,000.00 = R$ 10 billion)
const MAX_CENTS = 1_000_000_000_000;

/**
 * Schema for creating a new account
 */
export const createAccountSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name must be less than 100 characters"),
  type: accountTypeEnum,
  color: z.string().optional(),
  icon: z.string().optional(),
  balance: z.number().int().min(-MAX_CENTS).max(MAX_CENTS).default(0),
  ownerId: z.string().uuid().optional().nullable(),
  // Credit card fields
  creditLimit: z.number().int().min(0).max(MAX_CENTS).optional(),
  closingDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
});

/**
 * Schema for updating an account
 */
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name must be less than 100 characters")
    .optional(),
  type: accountTypeEnum.optional(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  balance: z.number().int().min(-MAX_CENTS).max(MAX_CENTS).optional(),
  ownerId: z.string().uuid().optional().nullable(),
  creditLimit: z.number().int().min(0).max(MAX_CENTS).optional().nullable(),
  closingDay: z.number().int().min(1).max(31).optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  isArchived: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

// Export inferred types
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
