import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, financialAccounts, categories, budgetMembers, budgets } from "@/db/schema";
import { eq, and, inArray, gte, lte, isNotNull, isNull, sql } from "drizzle-orm";
import { getUserBudgetIds, getUserMemberIdInBudget } from "@/shared/lib/api/permissions";
import {
  forbiddenError,
  successResponse,
  errorResponse,
} from "@/shared/lib/api/responses";

// GET - Get shared expenses balance between members for a given month
// Shows how much each member paid for shared expenses using personal accounts
export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;
  const { searchParams } = new URL(req.url);

  const budgetId = searchParams.get("budgetId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!budgetId) {
    return errorResponse("budgetId is required", 400);
  }

  const budgetIds = await getUserBudgetIds(session.user.id);
  if (!budgetIds.includes(budgetId)) {
    return forbiddenError("Budget not found or access denied");
  }

  // Check privacy mode - this report is only relevant for "visible" and "private"
  const [budget] = await db
    .select({ privacyMode: budgets.privacyMode })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);

  if (budget?.privacyMode === "unified") {
    return successResponse({ members: [], settlement: null, privacyMode: "unified" });
  }

  // Get all members in the budget
  const members = await db
    .select({
      id: budgetMembers.id,
      name: budgetMembers.name,
      color: budgetMembers.color,
      type: budgetMembers.type,
    })
    .from(budgetMembers)
    .where(eq(budgetMembers.budgetId, budgetId));

  // Only relevant for duo budgets (2+ members)
  if (members.length < 2) {
    return successResponse({ members: [], settlement: null });
  }

  const userMemberId = await getUserMemberIdInBudget(session.user.id, budgetId);

  // Date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Query: all expense transactions in the month where:
  // - The category is shared (category.memberId IS NULL)
  // - The account is personal (account.ownerId IS NOT NULL)
  // Group by account owner to see who paid what
  const sharedExpensesByPayer = await db
    .select({
      payerMemberId: transactions.paidByMemberId,
      total: sql<number>`COALESCE(ABS(SUM(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        inArray(transactions.status, ["cleared", "reconciled"]),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNull(categories.memberId), // Shared category
        isNotNull(transactions.paidByMemberId), // Has a payer
        isNotNull(financialAccounts.ownerId) // Paid from PERSONAL account (not shared)
      )
    )
    .groupBy(transactions.paidByMemberId);

  // Also get total shared expenses (from shared accounts) for context
  const [sharedAccountExpenses] = await db
    .select({
      total: sql<number>`COALESCE(ABS(SUM(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "expense"),
        inArray(transactions.status, ["cleared", "reconciled"]),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNull(categories.memberId), // Shared category
        isNull(financialAccounts.ownerId) // Shared account
      )
    );

  // Build per-member data
  const memberData = members.map((member) => {
    const paidFromPersonal = sharedExpensesByPayer.find(
      (e) => e.payerMemberId === member.id
    );
    return {
      id: member.id,
      name: member.name,
      color: member.color,
      type: member.type,
      paidFromPersonalAccount: Number(paidFromPersonal?.total ?? 0),
      isCurrentUser: member.id === userMemberId,
    };
  });

  // Calculate settlement: who owes whom
  const totalPaidFromPersonal = memberData.reduce(
    (sum, m) => sum + m.paidFromPersonalAccount, 0
  );

  // Query transfers between personal accounts of the two members this month
  // These are settlement payments that reduce the outstanding amount
  const memberIds = members.map((m) => m.id);
  const settlementTransfers = await db
    .select({
      paidByMemberId: transactions.paidByMemberId,
      toAccountOwnerId: sql<string>`dest_acct."owner_id"`,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .innerJoin(
      sql`${financialAccounts} AS dest_acct`,
      sql`dest_acct.id = ${transactions.toAccountId}`
    )
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "transfer"),
        inArray(transactions.status, ["cleared", "reconciled"]),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNotNull(financialAccounts.ownerId),
        sql`dest_acct."owner_id" IS NOT NULL`,
        // Only transfers between different members
        sql`${financialAccounts.ownerId} != dest_acct."owner_id"`,
        inArray(transactions.paidByMemberId, memberIds),
      )
    )
    .groupBy(transactions.paidByMemberId, sql`dest_acct."owner_id"`);

  // Build a map: payer -> amount already transferred to the other member
  const transfersByPayer = new Map<string, number>();
  for (const t of settlementTransfers) {
    const current = transfersByPayer.get(t.paidByMemberId!) ?? 0;
    transfersByPayer.set(t.paidByMemberId!, current + Number(t.total));
  }

  let settlement: { from: string; fromName: string; to: string; toName: string; amount: number } | null = null;

  if (totalPaidFromPersonal > 0 && memberData.length === 2) {
    const [m1, m2] = memberData;
    // Fair share: each should pay half
    const fairShare = totalPaidFromPersonal / 2;
    let m1Diff = m1.paidFromPersonalAccount - fairShare;

    // Adjust for transfers already made:
    // If m1 paid more (m1Diff > 0), m2 owes m1. Transfers from m2→m1 reduce the debt.
    // If m2 paid more (m1Diff < 0), m1 owes m2. Transfers from m1→m2 reduce the debt.
    const m1Transferred = transfersByPayer.get(m1.id) ?? 0; // m1 → m2
    const m2Transferred = transfersByPayer.get(m2.id) ?? 0; // m2 → m1
    m1Diff = m1Diff - m2Transferred + m1Transferred;

    if (Math.abs(m1Diff) > 100) { // > R$1.00 threshold
      if (m1Diff > 0) {
        // m1 paid more → m2 owes m1
        settlement = {
          from: m2.id,
          fromName: m2.name,
          to: m1.id,
          toName: m1.name,
          amount: Math.round(m1Diff),
        };
      } else {
        // m2 paid more → m1 owes m2
        settlement = {
          from: m1.id,
          fromName: m1.name,
          to: m2.id,
          toName: m2.name,
          amount: Math.round(Math.abs(m1Diff)),
        };
      }
    }
  }

  return successResponse({
    members: memberData,
    totalFromPersonalAccounts: totalPaidFromPersonal,
    totalFromSharedAccounts: Number(sharedAccountExpenses?.total ?? 0),
    settlement,
    privacyMode: budget?.privacyMode ?? "visible",
  });
});
