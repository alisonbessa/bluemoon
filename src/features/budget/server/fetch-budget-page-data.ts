import { db } from "@/db";
import {
  monthlyAllocations,
  monthlyGroupAllocations,
  budgetMembers,
  categories,
  groups,
  transactions,
  incomeSources,
  monthlyIncomeAllocations,
  recurringBills,
  financialAccounts,
  budgets,
} from "@/db/schema";
import { eq, and, inArray, sql, gte, lte, or, isNull } from "drizzle-orm";
import {
  ensurePendingTransactionsForMonth,
  autoActivateMonth,
} from "@/shared/lib/budget/pending-transactions";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
  getPartnerPrivacyLevel,
} from "@/shared/lib/api/permissions";
import {
  getViewModeCondition,
  type ViewMode,
} from "@/shared/lib/api/view-mode-filter";

/**
 * Shape returned by fetchBudgetAllocationsData.
 * Matches the SWR AllocationsResponse in use-budget-page-data.ts.
 */
export interface BudgetAllocationsResult {
  groups: Array<{
    group: typeof groups.$inferSelect;
    categories: Array<{
      category: typeof categories.$inferSelect;
      allocated: number;
      carriedOver: number;
      /** @deprecated use `confirmed` (pending + confirmed sum). Kept for compat. */
      spent: number;
      /** Pending expenses (status='pending') */
      pending: number;
      /** Confirmed expenses (status='cleared'|'reconciled') */
      confirmed: number;
      /** Planejado + carriedOver - pending - confirmed */
      saldo: number;
      /** @deprecated use `saldo`. Alias kept for compat. */
      available: number;
      isOtherMemberCategory: boolean;
      recurringBills: RecurringBillSummary[];
    }>;
    totals: {
      allocated: number;
      spent: number;
      pending: number;
      confirmed: number;
      saldo: number;
      available: number;
    };
    groupAllocated: number | null;
  }>;
  totals: {
    allocated: number;
    spent: number;
    pending: number;
    confirmed: number;
    saldo: number;
    available: number;
  };
  income: {
    byMember: Array<{
      member: typeof budgetMembers.$inferSelect | null;
      sources: Array<{
        incomeSource: typeof incomeSources.$inferSelect;
        planned: number;
        contributionPlanned: number;
        defaultAmount: number;
        defaultContribution: number;
        pending: number;
        received: number;
        saldo: number;
      }>;
      totals: { planned: number; contributionPlanned: number; pending: number; received: number; saldo: number };
    }>;
    totals: {
      planned: number;
      contributionPlanned: number;
      pending: number;
      received: number;
      saldo: number;
    };
  } | null;
  hasPreviousMonthData: boolean;
  hasContributionModel: boolean;
}

type RecurringBillSummary = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  dueDay: number | null;
  dueMonth: number | null;
  isAutoDebit: boolean;
  isVariable: boolean;
  startDate: Date | null;
  endDate: Date | null;
  account: { id: string; name: string; icon: string | null } | null;
};

/**
 * Fetch all allocations data directly from the database.
 * Used by the Server Component page for SSR.
 * Mirrors the logic in /api/app/allocations GET handler.
 */
export async function fetchBudgetAllocationsData(opts: {
  userId: string;
  budgetId: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}): Promise<BudgetAllocationsResult | null> {
  const { userId, budgetId, year, month, viewMode = "mine" } = opts;

  // Verify access
  const budgetIds = await getUserBudgetIds(userId);
  if (!budgetIds.includes(budgetId)) {
    return null;
  }

  // Lazy generation: ensure pending transactions exist and auto-activate current month
  await ensurePendingTransactionsForMonth(budgetId, year, month);
  await autoActivateMonth(budgetId, year, month);

  // Get user's member ID and budget privacy mode for visibility filtering
  const [userMemberId, budgetRow] = await Promise.all([
    getUserMemberIdInBudget(userId, budgetId),
    db
      .select({ privacyMode: budgets.privacyMode })
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1)
      .then((r) => r[0]),
  ]);

  const privacyMode = budgetRow?.privacyMode || "visible";

  // Get partner privacy level for "all" view mode
  const partnerPrivacy =
    viewMode === "all" && userMemberId
      ? await getPartnerPrivacyLevel(userId, budgetId)
      : undefined;

  // Build category visibility condition based on viewMode
  const categoryViewCondition = userMemberId
    ? getViewModeCondition({
        viewMode,
        userMemberId,
        ownerField: categories.memberId,
        partnerPrivacy,
        includeSharedInMine: true,
      })
    : undefined;

  // Build transaction visibility condition for spending queries
  const txViewCondition = userMemberId
    ? getViewModeCondition({
        viewMode,
        userMemberId,
        ownerField: transactions.memberId,
        partnerPrivacy,
      })
    : undefined;

  // Calculate date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // PERFORMANCE: Run independent queries in parallel
  const [budgetCategories, allocations, spending, bills, groupAllocations] = await Promise.all([
    // Get categories with their groups (filtered by viewMode)
    db
      .select({
        category: categories,
        group: groups,
      })
      .from(categories)
      .innerJoin(groups, eq(categories.groupId, groups.id))
      .where(
        and(
          eq(categories.budgetId, budgetId),
          eq(categories.isArchived, false),
          ...(categoryViewCondition ? [categoryViewCondition] : [])
        )
      )
      .orderBy(groups.displayOrder, categories.displayOrder),

    // Get allocations for this month
    db
      .select()
      .from(monthlyAllocations)
      .where(
        and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, year),
          eq(monthlyAllocations.month, month)
        )
      ),

    // Get spending per category split by status (pending vs confirmed)
    db
      .select({
        categoryId: transactions.categoryId,
        pendingSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)`,
        confirmedSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"]),
          ...(txViewCondition ? [txViewCondition] : [])
        )
      )
      .groupBy(transactions.categoryId),

    // Get recurring bills with account info
    db
      .select({
        bill: recurringBills,
        account: {
          id: financialAccounts.id,
          name: financialAccounts.name,
          icon: financialAccounts.icon,
        },
      })
      .from(recurringBills)
      .leftJoin(
        financialAccounts,
        eq(recurringBills.accountId, financialAccounts.id)
      )
      .where(
        and(
          eq(recurringBills.budgetId, budgetId),
          eq(recurringBills.isActive, true),
          // Only show bills active for this month (respect startDate/endDate)
          or(isNull(recurringBills.startDate), lte(recurringBills.startDate, endDate)),
          or(isNull(recurringBills.endDate), gte(recurringBills.endDate, startDate))
        )
      )
      .orderBy(recurringBills.displayOrder),

    // Get group allocations (ceilings) for this month
    db
      .select()
      .from(monthlyGroupAllocations)
      .where(
        and(
          eq(monthlyGroupAllocations.budgetId, budgetId),
          eq(monthlyGroupAllocations.year, year),
          eq(monthlyGroupAllocations.month, month)
        )
      ),
  ]);

  // Split spending into pending vs confirmed per category
  const spendingMap = new Map(
    spending.map((s) => [
      s.categoryId,
      {
        pending: Number(s.pendingSpent) || 0,
        confirmed: Number(s.confirmedSpent) || 0,
      },
    ])
  );
  const allocationsMap = new Map(
    allocations.map((a) => [a.categoryId, a])
  );

  // Calculate carriedOver from previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const prevMonthAllocationsList = await db
    .select()
    .from(monthlyAllocations)
    .where(
      and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, prevYear),
        eq(monthlyAllocations.month, prevMonth)
      )
    );

  const hasPreviousMonthData = prevMonthAllocationsList.length > 0;

  if (hasPreviousMonthData) {
    // Calculate date range for previous month
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

    // Get spending per category for previous month (used only for carry-over calc)
    const prevSpending = await db
      .select({
        categoryId: transactions.categoryId,
        totalSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.budgetId, budgetId),
          gte(transactions.date, prevStartDate),
          lte(transactions.date, prevEndDate),
          inArray(transactions.status, ["pending", "cleared", "reconciled"])
        )
      )
      .groupBy(transactions.categoryId);

    const prevSpendingMap = new Map(
      prevSpending.map((s) => [s.categoryId, Number(s.totalSpent) || 0])
    );

    // Build a map of category behaviors for carry-over logic
    const categoryBehaviorMap = new Map(
      budgetCategories.map(({ category }) => [category.id, category.behavior])
    );

    // Calculate carriedOver for each category (batched to avoid N+1)
    const carryOverUpdates: { id: string; carriedOver: number }[] = [];
    const carryOverInserts: { budgetId: string; categoryId: string; year: number; month: number; allocated: number; carriedOver: number }[] = [];

    for (const prevAlloc of prevMonthAllocationsList) {
      const prevSpent = prevSpendingMap.get(prevAlloc.categoryId) || 0;
      const prevAvailable =
        (prevAlloc.allocated || 0) + (prevAlloc.carriedOver || 0) - prevSpent;

      // Only carry over for "set_aside" categories
      const behavior =
        categoryBehaviorMap.get(prevAlloc.categoryId) || "refill_up";
      const carryOver =
        behavior === "set_aside" ? Math.max(0, prevAvailable) : 0;

      const currentAlloc = allocationsMap.get(prevAlloc.categoryId);

      if (currentAlloc) {
        if (currentAlloc.carriedOver !== carryOver) {
          carryOverUpdates.push({ id: currentAlloc.id, carriedOver: carryOver });
          currentAlloc.carriedOver = carryOver;
        }
      } else if (carryOver > 0) {
        carryOverInserts.push({
          budgetId,
          categoryId: prevAlloc.categoryId,
          year,
          month,
          allocated: 0,
          carriedOver: carryOver,
        });
      }
    }

    // Batch updates in parallel, batch inserts in one call
    const batchPromises: Promise<unknown>[] = [];
    if (carryOverUpdates.length > 0) {
      batchPromises.push(
        Promise.all(carryOverUpdates.map(u =>
          db.update(monthlyAllocations)
            .set({ carriedOver: u.carriedOver, updatedAt: new Date() })
            .where(eq(monthlyAllocations.id, u.id))
        ))
      );
    }
    if (carryOverInserts.length > 0) {
      batchPromises.push(
        db.insert(monthlyAllocations).values(carryOverInserts).returning()
          .then(newAllocs => {
            for (const newAlloc of newAllocs) {
              allocationsMap.set(newAlloc.categoryId, newAlloc);
            }
          })
      );
    }
    await Promise.all(batchPromises);
  }

  // Group allocation ceilings by groupId
  const groupAllocationsMap = new Map(
    groupAllocations.map((ga) => [ga.groupId, ga.allocated])
  );

  // Group bills by categoryId
  const billsMap = new Map<string, RecurringBillSummary[]>();

  for (const { bill, account } of bills) {
    if (!billsMap.has(bill.categoryId)) {
      billsMap.set(bill.categoryId, []);
    }
    billsMap.get(bill.categoryId)!.push({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      frequency: bill.frequency,
      dueDay: bill.dueDay,
      dueMonth: bill.dueMonth,
      isAutoDebit: bill.isAutoDebit ?? false,
      isVariable: bill.isVariable ?? false,
      startDate: bill.startDate,
      endDate: bill.endDate,
      account: account?.id
        ? { id: account.id, name: account.name, icon: account.icon }
        : null,
    });
  }

  // Group categories by group
  const groupedData = new Map<
    string,
    {
      group: typeof groups.$inferSelect;
      categories: Array<{
        category: typeof categories.$inferSelect;
        allocated: number;
        carriedOver: number;
        spent: number;
        pending: number;
        confirmed: number;
        saldo: number;
        available: number;
        isOtherMemberCategory: boolean;
        recurringBills: RecurringBillSummary[];
      }>;
      totals: { allocated: number; spent: number; pending: number; confirmed: number; saldo: number; available: number };
      groupAllocated: number | null; // Ceiling set by user, null = not set
    }
  >();

  for (const { category, group } of budgetCategories) {
    if (!groupedData.has(group.id)) {
      const ceiling = groupAllocationsMap.get(group.id);
      groupedData.set(group.id, {
        group,
        categories: [],
        totals: { allocated: 0, spent: 0, pending: 0, confirmed: 0, saldo: 0, available: 0 },
        groupAllocated: ceiling != null ? ceiling : null,
      });
    }

    const allocation = allocationsMap.get(category.id);
    const categoryBills = billsMap.get(category.id) || [];

    const billsTotal = categoryBills.reduce((sum, bill) => sum + bill.amount, 0);
    const manualAlloc = allocation?.allocated ?? 0;
    const allocated = manualAlloc > 0 ? manualAlloc : billsTotal;
    const carriedOver = allocation?.carriedOver || 0;
    const spendSplit = spendingMap.get(category.id) ?? { pending: 0, confirmed: 0 };
    const pending = spendSplit.pending;
    const confirmed = spendSplit.confirmed;
    const spent = pending + confirmed; // legacy alias
    const saldo = allocated + carriedOver - pending - confirmed;
    const available = saldo; // legacy alias

    const isOtherMemberCategory =
      category.memberId !== null && category.memberId !== userMemberId;

    // Server-side privacy enforcement
    if (privacyMode === "private" && isOtherMemberCategory) {
      continue;
    }

    const groupData = groupedData.get(group.id)!;

    groupData.categories.push({
      category,
      allocated,
      carriedOver,
      spent,
      pending,
      confirmed,
      saldo,
      available,
      isOtherMemberCategory,
      recurringBills: categoryBills,
    });
    groupData.totals.allocated += allocated + carriedOver;
    groupData.totals.spent += spent;
    groupData.totals.pending += pending;
    groupData.totals.confirmed += confirmed;
    groupData.totals.saldo += saldo;
    groupData.totals.available += saldo;
  }

  // Calculate overall totals
  const overallTotals = {
    allocated: 0,
    spent: 0,
    pending: 0,
    confirmed: 0,
    saldo: 0,
    available: 0,
  };

  const groupedResult = Array.from(groupedData.values())
    .sort((a, b) => a.group.displayOrder - b.group.displayOrder)
    .map((g) => {
      // Apply group ceiling: if user set a ceiling, use it as allocated
      if (g.groupAllocated != null && g.groupAllocated > 0) {
        g.totals.allocated = g.groupAllocated;
        g.totals.saldo = g.groupAllocated - g.totals.pending - g.totals.confirmed;
        g.totals.available = g.totals.saldo;
      }
      overallTotals.allocated += g.totals.allocated;
      overallTotals.spent += g.totals.spent;
      overallTotals.pending += g.totals.pending;
      overallTotals.confirmed += g.totals.confirmed;
      overallTotals.saldo += g.totals.saldo;
      overallTotals.available += g.totals.saldo;
      return g;
    });

  // PERFORMANCE: Run income-related queries in parallel
  const [budgetIncomeSources, incomeAllocations, incomeReceived] =
    await Promise.all([
      // Get income sources with member data (filtered by viewMode)
      (() => {
        const incomeViewCondition = userMemberId
          ? getViewModeCondition({
              viewMode,
              userMemberId,
              ownerField: incomeSources.memberId,
              partnerPrivacy,
            })
          : undefined;
        return db
          .select({
            incomeSource: incomeSources,
            member: budgetMembers,
          })
          .from(incomeSources)
          .leftJoin(
            budgetMembers,
            eq(incomeSources.memberId, budgetMembers.id)
          )
          .where(
            and(
              eq(incomeSources.budgetId, budgetId),
              eq(incomeSources.isActive, true),
              ...(incomeViewCondition ? [incomeViewCondition] : [])
            )
          )
          .orderBy(incomeSources.displayOrder);
      })(),

      // Get monthly income allocations (overrides for this month)
      db
        .select()
        .from(monthlyIncomeAllocations)
        .where(
          and(
            eq(monthlyIncomeAllocations.budgetId, budgetId),
            eq(monthlyIncomeAllocations.year, year),
            eq(monthlyIncomeAllocations.month, month)
          )
        ),

      // Get income received per income source for this month (split pending vs confirmed)
      db
        .select({
          incomeSourceId: transactions.incomeSourceId,
          pendingReceived: sql<number>`SUM(CASE WHEN ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)`,
          confirmedReceived: sql<number>`SUM(CASE WHEN ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.budgetId, budgetId),
            eq(transactions.type, "income"),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate),
            inArray(transactions.status, ["pending", "cleared", "reconciled"])
          )
        )
        .groupBy(transactions.incomeSourceId),
    ]);

  const incomeAllocationsMap = new Map(
    incomeAllocations.map((a) => [a.incomeSourceId, a])
  );

  const incomeReceivedMap = new Map(
    incomeReceived.map((i) => [
      i.incomeSourceId,
      {
        pending: Number(i.pendingReceived) || 0,
        confirmed: Number(i.confirmedReceived) || 0,
      },
    ])
  );

  // Group income sources by member
  const incomeByMember = new Map<
    string | null,
    {
      member: typeof budgetMembers.$inferSelect | null;
      sources: Array<{
        incomeSource: typeof incomeSources.$inferSelect;
        planned: number;
        contributionPlanned: number;
        defaultAmount: number;
        defaultContribution: number;
        pending: number;
        received: number;
        saldo: number;
      }>;
      totals: {
        planned: number;
        contributionPlanned: number;
        pending: number;
        received: number;
        saldo: number;
      };
    }
  >();

  for (const { incomeSource, member } of budgetIncomeSources) {
    const memberId = incomeSource.memberId;

    if (!incomeByMember.has(memberId)) {
      incomeByMember.set(memberId, {
        member,
        sources: [],
        totals: { planned: 0, contributionPlanned: 0, pending: 0, received: 0, saldo: 0 },
      });
    }

    // Annual sources only appear in their target month
    if (incomeSource.frequency === "annual" && incomeSource.monthOfYear !== month) {
      continue;
    }
    // Once (pontual) sources only appear in their specific month+year
    if (incomeSource.frequency === "once" && (incomeSource.monthOfYear !== month || incomeSource.yearOfPayment !== year)) {
      continue;
    }
    // Skip if before start date (inclusive)
    if (incomeSource.startYear && incomeSource.startMonth) {
      if (year < incomeSource.startYear || (year === incomeSource.startYear && month < incomeSource.startMonth)) {
        continue;
      }
    }
    // Skip if at or after end date (exclusive)
    if (incomeSource.endYear && incomeSource.endMonth) {
      if (year > incomeSource.endYear || (year === incomeSource.endYear && month >= incomeSource.endMonth)) {
        continue;
      }
    }

    const frequencyMultiplier =
      incomeSource.frequency === "weekly"
        ? 4
        : incomeSource.frequency === "biweekly"
          ? 2
          : 1;
    const defaultMonthlyAmount =
      (incomeSource.amount || 0) * frequencyMultiplier;
    const defaultMonthlyContribution =
      incomeSource.contributionAmount != null
        ? incomeSource.contributionAmount * frequencyMultiplier
        : defaultMonthlyAmount;

    const monthlyAlloc = incomeAllocationsMap.get(incomeSource.id);

    const planned = monthlyAlloc?.planned ?? defaultMonthlyAmount;

    const contributionPlanned =
      monthlyAlloc?.contributionPlanned ??
      (incomeSource.contributionAmount != null
        ? defaultMonthlyContribution
        : planned);

    const receivedSplit = incomeReceivedMap.get(incomeSource.id) ?? { pending: 0, confirmed: 0 };
    const pending = receivedSplit.pending;
    const received = receivedSplit.confirmed;
    // Saldo for income = what's still expected to come in
    // (pessimistic: do not count pending as "done")
    const saldo = Math.max(0, planned - received - pending);

    const memberData = incomeByMember.get(memberId)!;
    memberData.sources.push({
      incomeSource,
      planned,
      contributionPlanned,
      defaultAmount: defaultMonthlyAmount,
      defaultContribution: defaultMonthlyContribution,
      pending,
      received,
      saldo,
    });
    memberData.totals.planned += planned;
    memberData.totals.contributionPlanned += contributionPlanned;
    memberData.totals.pending += pending;
    memberData.totals.received += received;
    memberData.totals.saldo += saldo;
  }

  // Calculate total income from income sources
  const incomeTotals = {
    planned: 0,
    contributionPlanned: 0,
    pending: 0,
    received: 0,
    saldo: 0,
  };

  const incomeGroups = Array.from(incomeByMember.values()).map((g) => {
    incomeTotals.planned += g.totals.planned;
    incomeTotals.contributionPlanned += g.totals.contributionPlanned;
    incomeTotals.pending += g.totals.pending;
    incomeTotals.received += g.totals.received;
    incomeTotals.saldo += g.totals.saldo;
    return g;
  });

  return {
    groups: groupedResult,
    totals: overallTotals,
    income:
      incomeGroups.length > 0
        ? {
            byMember: incomeGroups,
            totals: incomeTotals,
          }
        : null,
    hasPreviousMonthData,
    hasContributionModel: incomeTotals.contributionPlanned !== incomeTotals.planned,
  };
}
