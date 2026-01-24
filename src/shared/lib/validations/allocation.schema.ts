import { z } from "zod";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for upserting a monthly allocation
 */
export const upsertAllocationSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  categoryId: z.string().uuid("Invalid category ID"),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  allocated: z.number().int().min(0).max(MAX_CENTS),
});

/**
 * Schema for copying allocations from one month to another
 */
export const copyAllocationsSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  fromYear: z.number().int().min(2020).max(2100),
  fromMonth: z.number().int().min(1).max(12),
  toYear: z.number().int().min(2020).max(2100),
  toMonth: z.number().int().min(1).max(12),
  mode: z.enum(["all", "empty_only"]).default("all"),
});

/**
 * Schema for upserting an income allocation
 */
export const upsertIncomeAllocationSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  incomeSourceId: z.string().uuid("Invalid income source ID"),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  planned: z.number().int().min(0).max(MAX_CENTS),
});

// Export inferred types
export type UpsertAllocationInput = z.infer<typeof upsertAllocationSchema>;
export type CopyAllocationsInput = z.infer<typeof copyAllocationsSchema>;
export type UpsertIncomeAllocationInput = z.infer<typeof upsertIncomeAllocationSchema>;
