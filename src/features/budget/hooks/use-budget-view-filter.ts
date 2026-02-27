'use client';

import { useMemo } from 'react';
import type { GroupData, IncomeData } from '../types';
import type { BudgetViewMode } from './use-budget-ui-state';

interface BudgetViewFilterInput {
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  incomeData: IncomeData | null;
  totalIncome: number;
  totalContribution: number;
  hasContributionModel: boolean;
  budgetViewMode: BudgetViewMode;
}

/**
 * Filters and transforms budget data based on view mode (shared vs personal).
 *
 * - Shared: shows contribution income + shared categories (memberId === null)
 * - Personal: shows personal reserve income + user's private categories
 */
export function useBudgetViewFilter({
  groupsData,
  totals,
  incomeData,
  totalIncome,
  totalContribution,
  hasContributionModel,
  budgetViewMode,
}: BudgetViewFilterInput) {
  const isPersonalView = hasContributionModel && budgetViewMode === 'personal';

  const filteredGroupsData = useMemo(() => {
    if (!hasContributionModel) return groupsData;

    const filterFn = isPersonalView
      ? (c: GroupData['categories'][number]) =>
          c.category.memberId != null && !c.isOtherMemberCategory
      : (c: GroupData['categories'][number]) =>
          c.category.memberId == null;

    return groupsData
      .map((g) => {
        const filtered = g.categories.filter(filterFn);
        if (filtered.length === 0) return null;
        return {
          ...g,
          categories: filtered,
          totals: {
            allocated: filtered.reduce((sum, c) => sum + c.allocated + c.carriedOver, 0),
            spent: filtered.reduce((sum, c) => sum + c.spent, 0),
            available: filtered.reduce((sum, c) => sum + c.available, 0),
          },
        };
      })
      .filter((g): g is GroupData => g !== null);
  }, [groupsData, hasContributionModel, isPersonalView]);

  const filteredTotals = useMemo(() => {
    if (!hasContributionModel) return totals;
    return {
      allocated: filteredGroupsData.reduce((sum, g) => sum + g.totals.allocated, 0),
      spent: filteredGroupsData.reduce((sum, g) => sum + g.totals.spent, 0),
      available: filteredGroupsData.reduce((sum, g) => sum + g.totals.available, 0),
    };
  }, [filteredGroupsData, hasContributionModel, totals]);

  const filteredIncomeData = useMemo(() => {
    if (!incomeData || !hasContributionModel) return incomeData;

    const transformMember = (memberGroup: IncomeData['byMember'][number]) => ({
      ...memberGroup,
      sources: memberGroup.sources.map((s) => ({
        ...s,
        planned: isPersonalView
          ? s.planned - (s.contributionPlanned ?? s.planned)
          : (s.contributionPlanned ?? s.planned),
        defaultAmount: isPersonalView
          ? s.defaultAmount - (s.defaultContribution ?? s.defaultAmount)
          : (s.defaultContribution ?? s.defaultAmount),
      })),
      totals: {
        ...memberGroup.totals,
        planned: isPersonalView
          ? memberGroup.totals.planned - (memberGroup.totals.contributionPlanned ?? memberGroup.totals.planned)
          : (memberGroup.totals.contributionPlanned ?? memberGroup.totals.planned),
      },
    });

    return {
      ...incomeData,
      byMember: incomeData.byMember.map(transformMember),
      totals: {
        ...incomeData.totals,
        planned: isPersonalView
          ? incomeData.totals.planned - totalContribution
          : totalContribution,
      },
    };
  }, [incomeData, hasContributionModel, isPersonalView, totalContribution]);

  const effectiveTotalIncome = useMemo(() => {
    if (!hasContributionModel) return totalIncome;
    return isPersonalView
      ? totalIncome - totalContribution
      : totalContribution;
  }, [hasContributionModel, isPersonalView, totalIncome, totalContribution]);

  return {
    isPersonalView,
    filteredGroupsData,
    filteredTotals,
    filteredIncomeData,
    effectiveTotalIncome,
  };
}
