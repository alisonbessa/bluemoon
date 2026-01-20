import type { AccountType } from "@/types/account";

export interface AccountOwner {
  id: string;
  name: string;
  type: string;
  color?: string | null;
}

export interface Account {
  id: string;
  budgetId: string;
  ownerId?: string | null;
  owner?: AccountOwner | null;
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
  ownerId?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  icon?: string;
  color?: string;
}
