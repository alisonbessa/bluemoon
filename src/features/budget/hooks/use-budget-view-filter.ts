'use client';

import { useMemo } from 'react';
import type { GroupData, IncomeData } from '../types';
import type { ViewMode } from '@/shared/providers/view-mode-provider';

// Goal type matching what the budget page provides
interface GoalLocal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthlyTarget: number;
  monthsRemaining: number;
  isCompleted: boolean;
  memberId?: string | null;
  isOtherMemberGoal?: boolean;
}

interface MemberInfo {
  id: string;
  name: string;
  color: string | null;
  userId?: string | null;
}

export interface BudgetSection {
  key: string;
  title: string;
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  goals: GoalLocal[];
  totalGoals: number;
  incomeData: IncomeData | null;
  effectiveTotalIncome: number;
  isPartnerSection?: boolean;
}

interface BudgetSectionsInput {
  groupsData: GroupData[];
  totals: { allocated: number; spent: number; available: number };
  incomeData: IncomeData | null;
  totalIncome: number;
  totalContribution: number;
  hasContributionModel: boolean;
  goals: GoalLocal[];
  userMemberId: string | null;
  members: MemberInfo[];
  viewMode: ViewMode;
}

function filterGroupsByMember(
  groupsData: GroupData[],
  filterFn: (c: GroupData['categories'][number]) => boolean
): GroupData[] {
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
}

function calcTotals(groupsData: GroupData[]) {
  return {
    allocated: groupsData.reduce((sum, g) => sum + g.totals.allocated, 0),
    spent: groupsData.reduce((sum, g) => sum + g.totals.spent, 0),
    available: groupsData.reduce((sum, g) => sum + g.totals.available, 0),
  };
}

function transformIncomeForView(
  incomeData: IncomeData | null,
  totalContribution: number,
  isPersonalView: boolean
): IncomeData | null {
  if (!incomeData) return null;

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
}

/**
 * Splits budget data into up to 3 sections based on ownership scope.
 *
 * - "Planejamento Compartilhado": categories where memberId === null
 * - "Meu Planejamento ([Name])": categories where memberId === userMemberId
 * - "Planejamento de [PartnerName]": categories where memberId belongs to partner
 *
 * Visibility is controlled by the global viewMode:
 * - "mine" -> only my section
 * - "shared" -> only shared section
 * - "all" -> all 3 sections
 */
export function useBudgetSections({
  groupsData,
  totals,
  incomeData,
  totalIncome,
  totalContribution,
  hasContributionModel,
  goals,
  userMemberId,
  members,
  viewMode,
}: BudgetSectionsInput) {
  const sections = useMemo(() => {
    // When there is no contribution model, show everything in a single section
    if (!hasContributionModel) {
      const section: BudgetSection = {
        key: 'all',
        title: 'Despesas',
        groupsData,
        totals,
        goals,
        totalGoals: goals.reduce((sum, g) => sum + (g.monthlyTarget || 0), 0),
        incomeData,
        effectiveTotalIncome: totalIncome,
      };
      return [section];
    }

    const result: BudgetSection[] = [];

    // Find partner member(s) for naming
    const partnerMembers = members.filter(
      (m) => m.id !== userMemberId
    );
    const userName = members.find((m) => m.id === userMemberId)?.name ?? 'Eu';
    const partnerName = partnerMembers.length === 1
      ? partnerMembers[0].name
      : 'Parceiro(a)';

    // Section 1: Shared (memberId === null)
    if (viewMode === 'shared' || viewMode === 'all') {
      const sharedGroups = filterGroupsByMember(
        groupsData,
        (c) => c.category.memberId == null
      );
      const sharedGoals = goals.filter((g) => !g.memberId);
      const sharedIncomeData = transformIncomeForView(incomeData, totalContribution, false);

      result.push({
        key: 'shared',
        title: 'Planejamento Compartilhado',
        groupsData: sharedGroups,
        totals: sharedGroups.length > 0 ? calcTotals(sharedGroups) : { allocated: 0, spent: 0, available: 0 },
        goals: sharedGoals,
        totalGoals: sharedGoals.reduce((sum, g) => sum + (g.monthlyTarget || 0), 0),
        incomeData: sharedIncomeData,
        effectiveTotalIncome: totalContribution,
      });
    }

    // Section 2: My planning (memberId === userMemberId)
    if (viewMode === 'mine' || viewMode === 'all') {
      const myGroups = filterGroupsByMember(
        groupsData,
        (c) => c.category.memberId === userMemberId && !c.isOtherMemberCategory
      );
      const myGoals = goals.filter((g) => g.memberId === userMemberId);
      const myIncomeData = transformIncomeForView(incomeData, totalContribution, true);
      const myTotalIncome = totalIncome - totalContribution;

      result.push({
        key: 'mine',
        title: `Meu Planejamento (${userName})`,
        groupsData: myGroups,
        totals: myGroups.length > 0 ? calcTotals(myGroups) : { allocated: 0, spent: 0, available: 0 },
        goals: myGoals,
        totalGoals: myGoals.reduce((sum, g) => sum + (g.monthlyTarget || 0), 0),
        incomeData: myIncomeData,
        effectiveTotalIncome: myTotalIncome,
      });
    }

    // Section 3: Partner's planning (only in "all" viewMode)
    if (viewMode === 'all' && partnerMembers.length > 0) {
      const partnerIds = new Set(partnerMembers.map((m) => m.id));
      const partnerGroups = filterGroupsByMember(
        groupsData,
        (c) => c.category.memberId != null && partnerIds.has(c.category.memberId)
      );
      const partnerGoals = goals.filter(
        (g) => g.memberId != null && partnerIds.has(g.memberId)
      );

      result.push({
        key: 'partner',
        title: `Planejamento de ${partnerName}`,
        groupsData: partnerGroups,
        totals: partnerGroups.length > 0 ? calcTotals(partnerGroups) : { allocated: 0, spent: 0, available: 0 },
        goals: partnerGoals,
        totalGoals: partnerGoals.reduce((sum, g) => sum + (g.monthlyTarget || 0), 0),
        incomeData: null, // Partner income not shown
        effectiveTotalIncome: 0,
        isPartnerSection: true,
      });
    }

    return result;
  }, [
    groupsData, totals, incomeData, totalIncome, totalContribution,
    hasContributionModel, goals, userMemberId, members, viewMode,
  ]);

  // Aggregate totals across visible sections (for the header)
  const aggregatedTotals = useMemo(() => {
    return {
      allocated: sections.reduce((sum, s) => sum + s.totals.allocated, 0),
      spent: sections.reduce((sum, s) => sum + s.totals.spent, 0),
      available: sections.reduce((sum, s) => sum + s.totals.available, 0),
    };
  }, [sections]);

  const aggregatedTotalGoals = useMemo(() => {
    return sections.reduce((sum, s) => sum + s.totalGoals, 0);
  }, [sections]);

  const aggregatedTotalIncome = useMemo(() => {
    // For the header, sum effective income of visible sections (but avoid double counting)
    // When "all": use total income (shared contribution + personal reserve covers everything)
    // When "shared" or "mine": use the section's effective income
    if (!hasContributionModel) return totalIncome;
    if (sections.length === 1) return sections[0].effectiveTotalIncome;
    // "all" mode: show total income
    return totalIncome;
  }, [sections, hasContributionModel, totalIncome]);

  return {
    sections,
    aggregatedTotals,
    aggregatedTotalGoals,
    aggregatedTotalIncome,
  };
}
