/**
 * Telegram User Repository
 *
 * Handles all database operations for telegram users.
 */

import { db } from '@/db';
import {
  telegramUsers,
  budgetMembers,
  financialAccounts,
  budgets,
  categories,
  groups,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
  TelegramConversationStep,
  TelegramConversationContext,
} from '@/db/schema/telegram-users';

export interface BudgetInfo {
  budget: { id: string; name: string };
  member: { id: string; name: string };
  defaultAccount: { id: string; name: string } | null;
  categories: {
    id: string;
    name: string;
    icon: string | null;
    groupName: string;
  }[];
}

/**
 * Get or create telegram user state
 */
export async function getOrCreateTelegramUser(
  chatId: number,
  telegramUserId?: number,
  username?: string,
  firstName?: string
) {
  const existing = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(telegramUsers)
    .values({
      chatId,
      telegramUserId,
      username,
      firstName,
    })
    .returning();

  return newUser;
}

/**
 * Get telegram user by chat ID
 */
export async function getTelegramUser(chatId: number) {
  const [user] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  return user ?? null;
}

/**
 * Update telegram user state
 */
export async function updateTelegramUser(
  chatId: number,
  step: TelegramConversationStep,
  context: TelegramConversationContext
) {
  await db
    .update(telegramUsers)
    .set({
      currentStep: step,
      context,
      updatedAt: new Date(),
    })
    .where(eq(telegramUsers.chatId, chatId));
}

/**
 * Connect telegram user to app user
 */
export async function connectTelegramUser(
  chatId: number,
  userId: string,
  telegramUserId?: number,
  username?: string,
  firstName?: string
) {
  const existing = await getTelegramUser(chatId);

  if (existing) {
    await db
      .update(telegramUsers)
      .set({
        userId,
        telegramUserId,
        username,
        firstName,
        currentStep: 'IDLE',
        context: {},
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.chatId, chatId));
  } else {
    await db.insert(telegramUsers).values({
      chatId,
      telegramUserId,
      username,
      firstName,
      userId,
      currentStep: 'IDLE',
      context: {},
    });
  }
}

/**
 * Check if telegram is already connected to another user
 */
export async function checkExistingConnection(chatId: number, userId: string) {
  const [existingTelegram] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.chatId, chatId));

  if (
    existingTelegram &&
    existingTelegram.userId &&
    existingTelegram.userId !== userId
  ) {
    return { type: 'telegram_connected_to_other' as const };
  }

  const [existingUser] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.userId, userId));

  if (existingUser && existingUser.chatId !== chatId) {
    return { type: 'user_has_other_telegram' as const };
  }

  return null;
}

/**
 * Get user's default budget and account info
 */
export async function getUserBudgetInfo(
  userId: string
): Promise<BudgetInfo | null> {
  // Get user's first budget
  const membership = await db
    .select({
      budget: budgets,
      member: budgetMembers,
    })
    .from(budgetMembers)
    .innerJoin(budgets, eq(budgetMembers.budgetId, budgets.id))
    .where(eq(budgetMembers.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  // Get default account (first checking account)
  const [defaultAccount] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.budgetId, membership[0].budget.id),
        eq(financialAccounts.type, 'checking')
      )
    )
    .limit(1);

  // Get expense categories
  const budgetCategories = await db
    .select({
      category: categories,
      group: groups,
    })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(
      and(
        eq(categories.budgetId, membership[0].budget.id),
        eq(categories.isArchived, false)
      )
    );

  return {
    budget: membership[0].budget,
    member: membership[0].member,
    defaultAccount: defaultAccount ?? null,
    categories: budgetCategories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
      icon: c.category.icon,
      groupName: c.group.name,
    })),
  };
}
