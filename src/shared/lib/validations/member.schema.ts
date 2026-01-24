import { z } from "zod";
import { memberTypeEnum } from "@/db/schema/budget-members";

// Max value in cents (R$ 100,000.00)
const MAX_PLEASURE_BUDGET = 10_000_000;

/**
 * Schema for creating a new dependent member (child or pet)
 * Adults are added through the invite system
 */
export const createMemberSchema = z.object({
  budgetId: z.string().uuid("Invalid budget ID"),
  name: z
    .string()
    .min(1, "Member name is required")
    .max(100, "Member name must be less than 100 characters"),
  type: memberTypeEnum.refine((val) => val === "child" || val === "pet", {
    message: "Can only add dependents (child or pet) through this endpoint",
  }),
  color: z.string().optional(),
  monthlyPleasureBudget: z.number().int().min(0).max(MAX_PLEASURE_BUDGET).default(0),
});

/**
 * Schema for updating a member
 */
export const updateMemberSchema = z.object({
  name: z
    .string()
    .min(1, "Member name is required")
    .max(100, "Member name must be less than 100 characters")
    .optional(),
  color: z.string().optional().nullable(),
  monthlyPleasureBudget: z.number().int().min(0).max(MAX_PLEASURE_BUDGET).optional(),
});

// Export inferred types
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
