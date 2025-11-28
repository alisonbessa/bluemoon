import type { AccountType } from "@/db/schema/accounts";

export interface Account {
  id: string;
  budgetId: string;
  name: string;
  type: AccountType;
  balance: number;
  icon?: string | null;
  color?: string | null;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
  clearedBalance?: number;
  isArchived?: boolean | null;
  displayOrder?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  icon?: string;
  color?: string;
}
