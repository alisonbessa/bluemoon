import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  categories,
  groups,
  goals,
  budgetMembers,
  budgets,
  monthlyAllocations,
  incomeSources,
  monthlyIncomeAllocations,
  recurringBills,
} from "@/db/schema";
import { eq, and, inArray, gte, lte, sql, isNotNull, isNull, or } from "drizzle-orm";
import { ensurePendingTransactionsForMonth } from "@/shared/lib/budget/pending-transactions";
import {
  getUserBudgetIds,
  getUserMemberIdInBudget,
  getPartnerPrivacyLevel,
} from "@/shared/lib/api/permissions";
import { parseViewMode, getViewModeCondition, type ViewMode } from "@/shared/lib/api/view-mode-filter";
import { getBillingCycleDates } from "@/shared/lib/billing-cycle";
import { calculateGoalMetrics } from "@/shared/lib/goals/calculate-metrics";

/**
 * Result shape returned by fetchDashboardData.
 * Matches the API response of /api/app/dashboard.
 */
export interface DashboardDataResult {
  allocations: {
    income?: { totals: { planned: number; contributionPlanned: number; received: number } };
    totals?: { allocated: number; spent: number };
    hasContributionModel?: boolean;
  };
  commitments: Array<{
    id: string;
    name: string;
    icon: string | null;
    targetDate: string;
    allocated: number;
    group: { id: string; name: string; code: string };
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goals: Array<Record<string, any>>;
  stats: {
    dailyChartData: Array<{
      day: number;
      date: string;
      income: number;
      expense: number;
      balance: number;
      pendingIncome: number;
      pendingExpense: number;
      pendingBalance: number;
    }>;
    monthlyComparison: Array<{
      month: string;
      year: number;
      label: string;
      income: number;
      expense: number;
    }>;
    creditCards: Array<{
      id: string;
      name: string;
      icon: string | null;
      creditLimit: number;
      spent: number;
      available: number;
    }>;
  };
}

/**
 * Fetch all dashboard data directly from the database.
 * Shared between the Server Component page and the API route.
 */
export async function fetchDashboardData(opts: {
  userId: string;
  budgetId: string;
  year: number;
  month: number;
  viewMode: ViewMode;
}): Promise<DashboardDataResult | null> {
  const { userId, budgetId, year, month, viewMode } = opts;

  // Verify access
  const budgetIds = await getUserBudgetIds(userId);
  if (!budgetIds.includes(budgetId)) {
    return null;
  }

  // Run shared prerequisite queries in parallel
  const [userMemberId, budgetRow] = await Promise.all([
    getUserMemberIdInBudget(userId, budgetId),
    db.select({ privacyMode: budgets.privacyMode }).from(budgets).where(eq(budgets.id, budgetId)).limit(1).then(r => r[0]),
  ]);

  const privacyMode = budgetRow?.privacyMode || "visible";
  const partnerPrivacy = viewMode === "all" && userMemberId
    ? await getPartnerPrivacyLevel(userId, budgetId)
    : undefined;

  // Ensure pending transactions exist (idempotent)
  await ensurePendingTransactionsForMonth(budgetId, year, month);

  // Date range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Build reusable view mode conditions
  const txViewCondition = userMemberId
    ? getViewModeCondition({ viewMode, userMemberId, ownerField: transactions.memberId, partnerPrivacy })
    : undefined;
  const categoryViewCondition = userMemberId
    ? getViewModeCondition({ viewMode, userMemberId, ownerField: categories.memberId, partnerPrivacy, includeSharedInMine: true })
    : undefined;
  const acctViewCondition = userMemberId
    ? getViewModeCondition({ viewMode, userMemberId, ownerField: financialAccounts.ownerId, partnerPrivacy })
    : undefined;

  // Run all section queries in parallel
  const [allocationsResult, commitmentsResult, goalsResult, statsResult] = await Promise.all([
    fetchAllocations({ budgetId, year, month, startDate, endDate, categoryViewCondition, txViewCondition, userMemberId, privacyMode, viewMode, partnerPrivacy }),
    fetchCommitments({ budgetId, year, month, categoryViewCondition, userMemberId }),
    fetchGoals({ budgetId, budgetIds, viewMode, userMemberId, partnerPrivacy, privacyMode }),
    fetchStats({ budgetId, year, month, startDate, endDate, txViewCondition, acctViewCondition }),
  ]);

  return {
    allocations: allocationsResult,
    commitments: commitmentsResult,
    goals: goalsResult.filter((g): g is NonNullable<typeof g> => g !== null),
    stats: statsResult,
  };
}

// === ALLOCATIONS SECTION (summary for dashboard) ===
async function fetchAllocations(opts: {
  budgetId: string;
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  categoryViewCondition: ReturnType<typeof getViewModeCondition>;
  txViewCondition: ReturnType<typeof getViewModeCondition>;
  userMemberId: string | null;
  privacyMode: string;
  viewMode: ReturnType<typeof parseViewMode>;
  partnerPrivacy: Awaited<ReturnType<typeof getPartnerPrivacyLevel>> | undefined;
}) {
  const { budgetId, year, month, startDate, endDate, categoryViewCondition, txViewCondition, userMemberId, privacyMode, viewMode, partnerPrivacy } = opts;

  const [budgetCategories, allocations, spending, bills, budgetIncomeSources, incomeAllocations, incomeReceived] = await Promise.all([
    db.select({ category: categories, group: groups })
      .from(categories)
      .innerJoin(groups, eq(categories.groupId, groups.id))
      .where(and(
        eq(categories.budgetId, budgetId),
        eq(categories.isArchived, false),
        ...(categoryViewCondition ? [categoryViewCondition] : [])
      ))
      .orderBy(groups.displayOrder, categories.displayOrder),

    db.select().from(monthlyAllocations)
      .where(and(
        eq(monthlyAllocations.budgetId, budgetId),
        eq(monthlyAllocations.year, year),
        eq(monthlyAllocations.month, month)
      )),

    db.select({
      categoryId: transactions.categoryId,
      totalSpent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
    }).from(transactions)
      .where(and(
        eq(transactions.budgetId, budgetId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        inArray(transactions.status, ["pending", "cleared", "reconciled"]),
        ...(txViewCondition ? [txViewCondition] : [])
      ))
      .groupBy(transactions.categoryId),

    db.select({ bill: recurringBills, account: { id: financialAccounts.id, name: financialAccounts.name, icon: financialAccounts.icon } })
      .from(recurringBills)
      .leftJoin(financialAccounts, eq(recurringBills.accountId, financialAccounts.id))
      .where(and(eq(recurringBills.budgetId, budgetId), eq(recurringBills.isActive, true)))
      .orderBy(recurringBills.displayOrder),

    // Income sources
    (() => {
      const incomeViewCondition = userMemberId
        ? getViewModeCondition({ viewMode, userMemberId, ownerField: incomeSources.memberId, partnerPrivacy })
        : undefined;
      return db.select({ incomeSource: incomeSources, member: budgetMembers })
        .from(incomeSources)
        .leftJoin(budgetMembers, eq(incomeSources.memberId, budgetMembers.id))
        .where(and(
          eq(incomeSources.budgetId, budgetId),
          eq(incomeSources.isActive, true),
          ...(incomeViewCondition ? [incomeViewCondition] : [])
        ))
        .orderBy(incomeSources.displayOrder);
    })(),

    db.select().from(monthlyIncomeAllocations)
      .where(and(
        eq(monthlyIncomeAllocations.budgetId, budgetId),
        eq(monthlyIncomeAllocations.year, year),
        eq(monthlyIncomeAllocations.month, month)
      )),

    db.select({
      incomeSourceId: transactions.incomeSourceId,
      totalReceived: sql<number>`SUM(${transactions.amount})`,
    }).from(transactions)
      .where(and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, "income"),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        inArray(transactions.status, ["pending", "cleared", "reconciled"])
      ))
      .groupBy(transactions.incomeSourceId),
  ]);

  // Process spending & allocations
  const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s.totalSpent) || 0]));
  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a]));

  // Bills map
  const billsMap = new Map<string, number>();
  for (const { bill } of bills) {
    billsMap.set(bill.categoryId, (billsMap.get(bill.categoryId) || 0) + bill.amount);
  }

  // Calculate totals
  let totalAllocated = 0;
  let totalSpent = 0;

  for (const { category } of budgetCategories) {
    const isOtherMember = category.memberId !== null && category.memberId !== userMemberId;
    if (privacyMode === "private" && isOtherMember) continue;

    const allocation = allocationsMap.get(category.id);
    const billsTotal = billsMap.get(category.id);
    const allocated = billsTotal ?? (allocation?.allocated || category.plannedAmount || 0);
    const carriedOver = allocation?.carriedOver || 0;
    const spent = spendingMap.get(category.id) || 0;

    totalAllocated += allocated + carriedOver;
    totalSpent += spent;
  }

  // Process income
  const incomeAllocationsMap = new Map(incomeAllocations.map((a) => [a.incomeSourceId, a]));
  const incomeReceivedMap = new Map(incomeReceived.map((i) => [i.incomeSourceId, Number(i.totalReceived) || 0]));

  let totalPlanned = 0;
  let totalContributionPlanned = 0;
  let totalReceived = 0;

  for (const { incomeSource } of budgetIncomeSources) {
    const frequencyMultiplier =
      incomeSource.frequency === "weekly" ? 4 :
      incomeSource.frequency === "biweekly" ? 2 : 1;
    const defaultMonthlyAmount = (incomeSource.amount || 0) * frequencyMultiplier;
    const defaultMonthlyContribution = incomeSource.contributionAmount != null
      ? incomeSource.contributionAmount * frequencyMultiplier
      : defaultMonthlyAmount;

    const monthlyAlloc = incomeAllocationsMap.get(incomeSource.id);
    const planned = monthlyAlloc?.planned ?? defaultMonthlyAmount;
    const contributionPlanned = monthlyAlloc?.contributionPlanned
      ?? (incomeSource.contributionAmount != null ? defaultMonthlyContribution : planned);

    totalPlanned += planned;
    totalContributionPlanned += contributionPlanned;
    totalReceived += incomeReceivedMap.get(incomeSource.id) || 0;
  }

  return {
    income: {
      totals: {
        planned: totalPlanned,
        contributionPlanned: totalContributionPlanned,
        received: totalReceived,
      },
    },
    totals: {
      allocated: totalAllocated,
      spent: totalSpent,
    },
    hasContributionModel: totalContributionPlanned !== totalPlanned,
  };
}

// === COMMITMENTS SECTION ===
async function fetchCommitments(opts: {
  budgetId: string;
  year: number;
  month: number;
  categoryViewCondition: ReturnType<typeof getViewModeCondition>;
  userMemberId: string | null;
}) {
  const { budgetId, year, month, categoryViewCondition } = opts;

  const today = new Date();
  const isCurrentOrFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() + 1);

  if (!isCurrentOrFutureMonth) {
    return [];
  }

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const upcomingCommitments = await db
    .select({ category: categories, group: groups })
    .from(categories)
    .innerJoin(groups, eq(categories.groupId, groups.id))
    .where(and(
      eq(categories.budgetId, budgetId),
      eq(categories.isArchived, false),
      isNotNull(categories.targetDate),
      gte(categories.targetDate, now),
      lte(categories.targetDate, futureDate),
      ...(categoryViewCondition ? [categoryViewCondition] : [])
    ))
    .orderBy(categories.targetDate);

  const categoryIds = upcomingCommitments.map((c) => c.category.id);
  const allocations = categoryIds.length > 0
    ? await db.select().from(monthlyAllocations)
        .where(and(
          eq(monthlyAllocations.budgetId, budgetId),
          eq(monthlyAllocations.year, now.getFullYear()),
          eq(monthlyAllocations.month, now.getMonth() + 1)
        ))
    : [];

  const allocationsMap = new Map(allocations.map((a) => [a.categoryId, a.allocated || 0]));

  return upcomingCommitments.map(({ category, group }) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    targetDate: category.targetDate?.toISOString() ?? "",
    allocated: allocationsMap.get(category.id) || category.plannedAmount || 0,
    group: { id: group.id, name: group.name, code: group.code },
  }));
}

// === GOALS SECTION ===
async function fetchGoals(opts: {
  budgetId: string;
  budgetIds: string[];
  viewMode: ReturnType<typeof parseViewMode>;
  userMemberId: string | null;
  partnerPrivacy: Awaited<ReturnType<typeof getPartnerPrivacyLevel>> | undefined;
  privacyMode: string;
}) {
  const { budgetId, budgetIds, viewMode, userMemberId, partnerPrivacy, privacyMode } = opts;

  const conditions = [
    inArray(goals.budgetId, budgetIds),
    eq(goals.budgetId, budgetId),
    eq(goals.isArchived, false),
  ];

  if (userMemberId) {
    const viewCondition = getViewModeCondition({
      viewMode,
      userMemberId,
      ownerField: financialAccounts.ownerId,
      partnerPrivacy,
    });
    if (viewCondition) {
      conditions.push(or(viewCondition, isNull(goals.accountId))!);
    }
  }

  const userGoals = await db
    .select({ goal: goals })
    .from(goals)
    .leftJoin(financialAccounts, eq(goals.accountId, financialAccounts.id))
    .where(and(...conditions))
    .orderBy(goals.displayOrder);

  return userGoals
    .map(({ goal }) => {
      const isOtherMemberGoal = goal.memberId !== null && goal.memberId !== userMemberId;
      if (privacyMode === "private" && isOtherMemberGoal) return null;
      const metrics = calculateGoalMetrics(goal);
      return { ...goal, ...metrics, isOtherMemberGoal };
    })
    .filter(Boolean);
}

// === STATS SECTION (charts + credit cards) ===
async function fetchStats(opts: {
  budgetId: string;
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  txViewCondition: ReturnType<typeof getViewModeCondition>;
  acctViewCondition: ReturnType<typeof getViewModeCondition>;
}) {
  const { budgetId, year, month, startDate, endDate, txViewCondition, acctViewCondition } = opts;

  const daysInMonth = endDate.getDate();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const rangeStartDate = new Date(year, month - 1 - 11, 1);

  const baseDailyConditions = [
    eq(transactions.budgetId, budgetId),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    inArray(transactions.status, ["pending", "cleared", "reconciled"]),
    ...(txViewCondition ? [txViewCondition] : []),
  ];

  const baseMonthlyConditions = [
    eq(transactions.budgetId, budgetId),
    gte(transactions.date, rangeStartDate),
    lte(transactions.date, endDate),
    inArray(transactions.status, ["pending", "cleared", "reconciled"]),
    ...(txViewCondition ? [txViewCondition] : []),
  ];

  const baseCcConditions = [
    eq(financialAccounts.budgetId, budgetId),
    eq(financialAccounts.type, "credit_card"),
    eq(financialAccounts.isArchived, false),
    ...(acctViewCondition ? [acctViewCondition] : []),
  ];

  const [dailyData, monthlyAggregated, creditCardAccounts] = await Promise.all([
    db.select({
      day: sql<number>`EXTRACT(DAY FROM ${transactions.date})::integer`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} IN ('cleared', 'reconciled') THEN ${transactions.amount} ELSE 0 END)), 0)`,
      pendingIncome: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END), 0)`,
      pendingExpense: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.status} = 'pending' THEN ${transactions.amount} ELSE 0 END)), 0)`,
    }).from(transactions)
      .where(and(...baseDailyConditions))
      .groupBy(sql`EXTRACT(DAY FROM ${transactions.date})`)
      .orderBy(sql`EXTRACT(DAY FROM ${transactions.date})`),

    db.select({
      txYear: sql<number>`EXTRACT(YEAR FROM ${transactions.date})::integer`,
      txMonth: sql<number>`EXTRACT(MONTH FROM ${transactions.date})::integer`,
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    }).from(transactions)
      .where(and(...baseMonthlyConditions))
      .groupBy(sql`EXTRACT(YEAR FROM ${transactions.date})`, sql`EXTRACT(MONTH FROM ${transactions.date})`),

    db.select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      icon: financialAccounts.icon,
      creditLimit: financialAccounts.creditLimit,
      closingDay: financialAccounts.closingDay,
    }).from(financialAccounts).where(and(...baseCcConditions)),
  ]);

  // Build daily chart data
  const dailyChartData = [];
  let cumulativeBalance = 0;
  let cumulativePendingBalance = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = dailyData.find((d) => d.day === day);
    const income = Number(dayData?.income) || 0;
    const expense = Number(dayData?.expense) || 0;
    const pendingIncome = Number(dayData?.pendingIncome) || 0;
    const pendingExpense = Number(dayData?.pendingExpense) || 0;

    cumulativeBalance += income - expense;
    cumulativePendingBalance += (income + pendingIncome) - (expense + pendingExpense);

    dailyChartData.push({
      day,
      date: `${day}/${month}`,
      income,
      expense,
      balance: cumulativeBalance,
      pendingIncome,
      pendingExpense,
      pendingBalance: cumulativePendingBalance,
    });
  }

  // Build monthly comparison
  const monthlyMap = new Map(monthlyAggregated.map((m) => [`${m.txYear}-${m.txMonth}`, m]));
  const monthlyComparison = [];
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(year, month - 1 - i, 1);
    const tYear = targetDate.getFullYear();
    const tMonth = targetDate.getMonth() + 1;
    const data = monthlyMap.get(`${tYear}-${tMonth}`);
    monthlyComparison.push({
      month: monthNames[tMonth - 1],
      year: tYear,
      label: `${monthNames[tMonth - 1]}/${tYear.toString().slice(-2)}`,
      income: Number(data?.income) || 0,
      expense: Number(data?.expense) || 0,
    });
  }

  // Credit card spending
  let creditCards: { id: string; name: string; icon: string | null; creditLimit: number; spent: number; available: number }[] = [];

  if (creditCardAccounts.length > 0) {
    let globalStart = startDate;
    let globalEnd = endDate;
    const billingRanges = new Map<string, { start: Date; end: Date }>();

    for (const cc of creditCardAccounts) {
      if (cc.closingDay) {
        const cycle = getBillingCycleDates(cc.closingDay, year, month);
        billingRanges.set(cc.id, cycle);
        if (cycle.start < globalStart) globalStart = cycle.start;
        if (cycle.end > globalEnd) globalEnd = cycle.end;
      } else {
        billingRanges.set(cc.id, { start: startDate, end: endDate });
      }
    }

    const ccIds = creditCardAccounts.map((cc) => cc.id);
    const ccTransactions = await db
      .select({ accountId: transactions.accountId, amount: transactions.amount, date: transactions.date })
      .from(transactions)
      .where(and(
        inArray(transactions.accountId, ccIds),
        eq(transactions.type, "expense"),
        gte(transactions.date, globalStart),
        lte(transactions.date, globalEnd),
        inArray(transactions.status, ["pending", "cleared", "reconciled"])
      ));

    creditCards = creditCardAccounts.map((cc) => {
      const range = billingRanges.get(cc.id)!;
      const startTime = range.start.getTime();
      const endTime = range.end.getTime();
      let spent = 0;
      for (const tx of ccTransactions) {
        if (tx.accountId === cc.id) {
          const txTime = new Date(tx.date).getTime();
          if (txTime >= startTime && txTime <= endTime) {
            spent += Math.abs(Number(tx.amount) || 0);
          }
        }
      }
      return {
        id: cc.id,
        name: cc.name,
        icon: cc.icon,
        creditLimit: cc.creditLimit || 0,
        spent,
        available: (cc.creditLimit || 0) - spent,
      };
    });
  }

  return { dailyChartData, monthlyComparison, creditCards };
}
