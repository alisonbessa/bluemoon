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

  // Query transfers between personal accounts of different members this month.
  // Uses source account ownerId (not paidByMemberId) to determine who sent money.
  // Two-step: fetch transfers, then resolve account owners to avoid complex raw SQL joins.
  const transferRows = await db
    .select({
      amount: transactions.amount,
      sourceOwnerId: financialAccounts.ownerId,
      toAccountId: transactions.toAccountId,
      date: transactions.date,
    })
    .from(transactions)
    .innerJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "transfer"),
        inArray(transactions.status, ["cleared", "reconciled"]),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNotNull(financialAccounts.ownerId),
        isNotNull(transactions.toAccountId),
      )
    );

  // Resolve destination account owners in one query
  const destAccountIds = [...new Set(transferRows.map((t) => t.toAccountId!).filter(Boolean))];
  const destOwnerMap = new Map<string, string>();
  if (destAccountIds.length > 0) {
    const destAccounts = await db
      .select({ id: financialAccounts.id, ownerId: financialAccounts.ownerId })
      .from(financialAccounts)
      .where(and(
        inArray(financialAccounts.id, destAccountIds),
        isNotNull(financialAccounts.ownerId),
      ));
    for (const a of destAccounts) {
      if (a.ownerId) destOwnerMap.set(a.id, a.ownerId);
    }
  }

  // Build net transfers: sourceOwner → amount sent to the other member
  const transfersBySourceOwner = new Map<string, number>();
  for (const t of transferRows) {
    const destOwnerId = destOwnerMap.get(t.toAccountId!);
    if (!t.sourceOwnerId || !destOwnerId) continue;
    if (t.sourceOwnerId === destOwnerId) continue; // Same owner, skip
    const current = transfersBySourceOwner.get(t.sourceOwnerId) ?? 0;
    transfersBySourceOwner.set(t.sourceOwnerId, current + Number(t.amount));
  }

  let settlement: { from: string; fromName: string; to: string; toName: string; amount: number } | null = null;

  if (totalPaidFromPersonal > 0 && memberData.length === 2) {
    const [m1, m2] = memberData;
    // Fair share: each should pay half
    const fairShare = totalPaidFromPersonal / 2;
    let m1Diff = m1.paidFromPersonalAccount - fairShare;

    // Adjust for transfers already made between members:
    // sourceOwner = who the money left from (account owner, not transaction creator)
    const m1Sent = transfersBySourceOwner.get(m1.id) ?? 0; // m1's account → m2's account
    const m2Sent = transfersBySourceOwner.get(m2.id) ?? 0; // m2's account → m1's account
    // m2 sending to m1 reduces what m2 owes (reduces m1Diff)
    // m1 sending to m2 increases what m2 owes (increases m1Diff)
    m1Diff = m1Diff - m2Sent + m1Sent;

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

  // Build settlement history for the UI
  const settledTransfers: { fromName: string; toName: string; amount: number; date: string }[] = [];
  const memberNameMap = new Map(members.map((m) => [m.id, m.name]));
  for (const t of transferRows) {
    const destOwnerId = destOwnerMap.get(t.toAccountId!);
    if (!t.sourceOwnerId || !destOwnerId || t.sourceOwnerId === destOwnerId) continue;
    settledTransfers.push({
      fromName: memberNameMap.get(t.sourceOwnerId) ?? "?",
      toName: memberNameMap.get(destOwnerId) ?? "?",
      amount: Number(t.amount),
      date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
    });
  }

  return successResponse({
    members: memberData,
    totalFromPersonalAccounts: totalPaidFromPersonal,
    totalFromSharedAccounts: Number(sharedAccountExpenses?.total ?? 0),
    settlement,
    settledTransfers,
    privacyMode: budget?.privacyMode ?? "visible",
  });
});
