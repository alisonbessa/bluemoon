import { z } from "zod";
import { incomeTypeEnum, incomeFrequencyEnum } from "@/db/schema/income-sources";

// Max value in cents (R$ 10,000,000.00)
const MAX_CENTS = 1_000_000_000;

/**
 * Schema for creating a new income source
 *
 * Note: dayOfMonth has different meanings based on frequency:
 * - weekly: 0-6 (0=Sunday, 6=Saturday) - day of week when payment occurs
 * - biweekly/monthly: 1-31 (day of month)
 */
export const createIncomeSourceSchema = z
  .object({
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
    contributionAmount: z
      .number()
      .int("Contribution must be in cents (integer)")
      .min(0, "Contribution must be non-negative")
      .max(MAX_CENTS, "Contribution exceeds maximum allowed")
      .optional()
      .nullable(),
    frequency: incomeFrequencyEnum.default("monthly"),
    dayOfMonth: z.number().int().min(0).max(31).optional().nullable(),
    monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
    yearOfPayment: z.number().int().min(2000).max(2100).optional().nullable(),
    startYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startMonth: z.number().int().min(1).max(12).optional().nullable(),
    isAutoConfirm: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.contributionAmount != null) {
        return data.contributionAmount <= data.amount;
      }
      return true;
    },
    {
      message: "Contribuição não pode ser maior que o valor da renda",
      path: ["contributionAmount"],
    }
  )
  .refine(
    (data) => {
      // Weekly dayOfMonth should be 0-6 (day of week)
      if (
        data.frequency === "weekly" &&
        data.dayOfMonth !== null &&
        data.dayOfMonth !== undefined
      ) {
        return data.dayOfMonth >= 0 && data.dayOfMonth <= 6;
      }
      return true;
    },
    {
      message: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)",
      path: ["dayOfMonth"],
    }
  )
  .refine(
    (data) => {
      // Monthly/Biweekly dayOfMonth should be 1-31 (day of month)
      if (
        (data.frequency === "monthly" || data.frequency === "biweekly") &&
        data.dayOfMonth !== null &&
        data.dayOfMonth !== undefined
      ) {
        return data.dayOfMonth >= 1 && data.dayOfMonth <= 31;
      }
      return true;
    },
    {
      message: "Para mensal/quinzenal, dia deve ser 1 a 31",
      path: ["dayOfMonth"],
    }
  );

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
  contributionAmount: z.number().int().min(0).max(MAX_CENTS).optional().nullable(),
  frequency: incomeFrequencyEnum.optional(),
  dayOfMonth: z.number().int().min(0).max(31).optional().nullable(),
  monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
  yearOfPayment: z.number().int().min(2000).max(2100).optional().nullable(),
  startYear: z.number().int().min(2000).max(2100).optional().nullable(),
  startMonth: z.number().int().min(1).max(12).optional().nullable(),
  endYear: z.number().int().min(2000).max(2100).optional().nullable(),
  endMonth: z.number().int().min(1).max(12).optional().nullable(),
  isAutoConfirm: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

/**
 * Helper function to validate frequency-dependent fields
 * Use this in API routes when updating to validate against current frequency
 */
export function validateIncomeFrequencyFields(
  frequency: string,
  dayOfMonth: number | null | undefined
): { valid: boolean; error?: string } {
  // Weekly dayOfMonth should be 0-6 (day of week)
  if (frequency === "weekly" && dayOfMonth !== null && dayOfMonth !== undefined) {
    if (dayOfMonth < 0 || dayOfMonth > 6) {
      return {
        valid: false,
        error: "Para semanal, dia deve ser 0 (Domingo) a 6 (Sábado)",
      };
    }
  }

  // Monthly/Biweekly dayOfMonth should be 1-31 (day of month)
  if (
    (frequency === "monthly" || frequency === "biweekly") &&
    dayOfMonth !== null &&
    dayOfMonth !== undefined
  ) {
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      return { valid: false, error: "Para mensal/quinzenal, dia deve ser 1 a 31" };
    }
  }

  // Annual requires monthOfYear to be set (validated separately at route level)

  return { valid: true };
}

// Export inferred types
export type CreateIncomeSourceInput = z.infer<typeof createIncomeSourceSchema>;
export type UpdateIncomeSourceInput = z.infer<typeof updateIncomeSourceSchema>;
