import { z } from "zod";
import { recurringBillFrequencyEnum } from "@/db/schema/recurring-bills";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for creating a new recurring bill
 *
 * Note: dueDay has different meanings based on frequency:
 * - weekly: 0-6 (0=Sunday, 6=Saturday)
 * - monthly/yearly: 1-31 (day of month)
 */
export const createRecurringBillSchema = z
  .object({
    budgetId: z.string().uuid("Invalid budget ID"),
    categoryId: z.string().uuid("Invalid category ID"),
    accountId: z.string().uuid("Invalid account ID"),
    name: z
      .string()
      .min(1, "Bill name is required")
      .max(100, "Bill name must be less than 100 characters"),
    amount: z.number().int().min(0).max(MAX_CENTS),
    frequency: recurringBillFrequencyEnum.default("monthly"),
    dueDay: z.number().int().min(0).max(31).optional().nullable(),
    dueMonth: z.number().int().min(1).max(12).optional().nullable(),
    isAutoDebit: z.boolean().default(false),
    isVariable: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Yearly requires dueMonth
      if (data.frequency === "yearly" && !data.dueMonth) {
        return false;
      }
      return true;
    },
    {
      message: "Despesa anual requer mês de vencimento",
      path: ["dueMonth"],
    }
  )
  .refine(
    (data) => {
      // Weekly dueDay should be 0-6 (day of week)
      if (
        data.frequency === "weekly" &&
        data.dueDay !== null &&
        data.dueDay !== undefined
      ) {
        return data.dueDay >= 0 && data.dueDay <= 6;
      }
      return true;
    },
    {
      message: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)",
      path: ["dueDay"],
    }
  )
  .refine(
    (data) => {
      // Monthly/Yearly dueDay should be 1-31 (day of month)
      if (
        (data.frequency === "monthly" || data.frequency === "yearly") &&
        data.dueDay !== null &&
        data.dueDay !== undefined
      ) {
        return data.dueDay >= 1 && data.dueDay <= 31;
      }
      return true;
    },
    {
      message: "Para mensal/anual, dia deve ser 1 a 31",
      path: ["dueDay"],
    }
  );

/**
 * Schema for updating a recurring bill
 */
export const updateRecurringBillSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID").optional(),
  accountId: z.string().uuid("Invalid account ID").optional(),
  name: z
    .string()
    .min(1, "Bill name is required")
    .max(100, "Bill name must be less than 100 characters")
    .optional(),
  amount: z.number().int().min(0).max(MAX_CENTS).optional(),
  frequency: recurringBillFrequencyEnum.optional(),
  dueDay: z.number().int().min(0).max(31).optional().nullable(),
  dueMonth: z.number().int().min(1).max(12).optional().nullable(),
  isAutoDebit: z.boolean().optional(),
  isVariable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

/**
 * Helper function to validate frequency-dependent fields
 * Use this in API routes when updating to validate against current frequency
 */
export function validateFrequencyFields(
  frequency: string,
  dueDay: number | null | undefined,
  dueMonth: number | null | undefined
): { valid: boolean; error?: string } {
  // Yearly requires dueMonth
  if (frequency === "yearly" && !dueMonth) {
    return { valid: false, error: "Despesa anual requer mês de vencimento" };
  }

  // Weekly dueDay should be 0-6 (day of week)
  if (frequency === "weekly" && dueDay !== null && dueDay !== undefined) {
    if (dueDay < 0 || dueDay > 6) {
      return {
        valid: false,
        error: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)",
      };
    }
  }

  // Monthly/Yearly dueDay should be 1-31 (day of month)
  if (
    (frequency === "monthly" || frequency === "yearly") &&
    dueDay !== null &&
    dueDay !== undefined
  ) {
    if (dueDay < 1 || dueDay > 31) {
      return { valid: false, error: "Para mensal/anual, dia deve ser 1 a 31" };
    }
  }

  return { valid: true };
}

// Export inferred types
export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;
export type UpdateRecurringBillInput = z.infer<typeof updateRecurringBillSchema>;
