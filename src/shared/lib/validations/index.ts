/**
 * Centralized Validation Schemas
 * All Zod validation schemas for API routes and forms
 */

// Auth schemas
export {
  signUpRequestSchema,
  setPasswordSchema,
  loginSchema,
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
  type SignUpRequestInput,
  type SetPasswordInput,
  type LoginInput,
  type ResetPasswordRequestInput,
  type ResetPasswordConfirmInput,
} from "./auth.schema";

// Profile schemas
export {
  profileUpdateSchema,
  type ProfileUpdateValues,
} from "./profile.schema";

// Plan schemas
export {
  planFormSchema,
  type PlanFormValues,
} from "./plan.schema";

// Account schemas
export {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "./account.schema";

// Transaction schemas
export {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "./transaction.schema";

// Category schemas
export {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./category.schema";

// Income schemas
export {
  createIncomeSourceSchema,
  updateIncomeSourceSchema,
  type CreateIncomeSourceInput,
  type UpdateIncomeSourceInput,
} from "./income.schema";

// Goal schemas
export {
  createGoalSchema,
  updateGoalSchema,
  goalContributionSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
  type GoalContributionInput,
} from "./goal.schema";

// Budget schemas
export {
  createBudgetSchema,
  updateBudgetSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from "./budget.schema";

// Member schemas
export {
  createMemberSchema,
  updateMemberSchema,
  type CreateMemberInput,
  type UpdateMemberInput,
} from "./member.schema";

// Allocation schemas
export {
  upsertAllocationSchema,
  copyAllocationsSchema,
  upsertIncomeAllocationSchema,
  type UpsertAllocationInput,
  type CopyAllocationsInput,
  type UpsertIncomeAllocationInput,
} from "./allocation.schema";

// Recurring Bill schemas
export {
  createRecurringBillSchema,
  updateRecurringBillSchema,
  validateFrequencyFields,
  type CreateRecurringBillInput,
  type UpdateRecurringBillInput,
} from "./recurring-bill.schema";
