import { z } from "zod";
import {
  financialTransactionTypeEnum,
  financialTransactionStatusEnum,
} from "@/db/schema/transactions";

// Max value in cents (R$ 10,000,000,000.00 = R$ 10 billion)
const MAX_CENTS = 1_000_000_000_000;

/**
 * Schema for creating a new transaction
 */
export const createTransactionSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  accountId: z.string().uuid("Invalid account ID"),
  categoryId: z.string().uuid().optional(), // For expense transactions
  incomeSourceId: z.string().uuid().optional(), // For income transactions
  memberId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(), // For transfers
  recurringBillId: z.string().uuid().optional(), // Link to recurring bill
  type: financialTransactionTypeEnum,
  status: financialTransactionStatusEnum.optional(), // Default: pending
  amount: z
    .number()
    .int("Amount must be in cents (integer)")
    .min(1, "Amount must be positive")
    .max(MAX_CENTS, "Amount exceeds maximum allowed"),
  description: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().or(z.date()),
  // Installment fields
  isInstallment: z.boolean().optional(),
  totalInstallments: z.number().int().min(2).max(72).optional(),
});

/**
 * Schema for updating a transaction
 */
export const updateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  incomeSourceId: z.string().uuid().optional().nullable(),
  toAccountId: z.string().uuid().optional().nullable(),
  type: financialTransactionTypeEnum.optional(),
  status: financialTransactionStatusEnum.optional(),
  amount: z.number().int().min(1).max(MAX_CENTS).optional(),
  description: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  date: z.string().datetime().or(z.date()).optional(),
});

// Export inferred types
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
