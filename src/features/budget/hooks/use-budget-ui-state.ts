'use client';

import { useState, useCallback } from 'react';

/** View mode for mobile - which column to show */
export type MobileViewMode = 'planned' | 'actual' | 'available';

interface UseBudgetUIStateReturn {
  // Section expansion
  isIncomeExpanded: boolean;
  isExpensesExpanded: boolean;
  isGoalsExpanded: boolean;
  toggleIncomeSection: () => void;
  toggleExpensesSection: () => void;
  toggleGoalsSection: () => void;

  // Group and member expansion
  expandedGroups: string[];
  expandedIncomeMembers: string[];
  toggleGroup: (groupId: string) => void;
  toggleIncomeMember: (memberId: string) => void;
  setExpandedGroups: (groups: string[]) => void;
  setExpandedIncomeMembers: (members: string[]) => void;

  // Mobile view mode
  mobileViewMode: MobileViewMode;
  setMobileViewMode: (mode: MobileViewMode) => void;
}

interface UseBudgetUIStateOptions {
  /** Default section to expand. Defaults to 'income' */
  defaultExpandedSection?: 'income' | 'expenses' | 'goals' | 'none';
  /** Default mobile view mode. Defaults to 'available' */
  defaultMobileViewMode?: MobileViewMode;
}

/**
 * Hook for managing budget page UI state
 *
 * Handles:
 * - Section accordion state (income/expenses/goals)
 * - Group and member expansion
 *
 * @example
 * ```tsx
 * const {
 *   isIncomeExpanded,
 *   toggleIncomeSection,
 *   expandedGroups,
 *   toggleGroup,
 * } = useBudgetUIState();
 * ```
 */
export function useBudgetUIState(options: UseBudgetUIStateOptions = {}): UseBudgetUIStateReturn {
  const { defaultExpandedSection = 'income', defaultMobileViewMode = 'available' } = options;

  // Section expansion state
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(defaultExpandedSection === 'income');
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(defaultExpandedSection === 'expenses');
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(defaultExpandedSection === 'goals');

  // Group/member expansion
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedIncomeMembers, setExpandedIncomeMembers] = useState<string[]>([]);

  // Mobile view mode
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>(defaultMobileViewMode);

  // Accordion toggle functions - close others when opening one
  const toggleIncomeSection = useCallback(() => {
    const newState = !isIncomeExpanded;
    setIsIncomeExpanded(newState);
    if (newState) {
      setIsExpensesExpanded(false);
      setIsGoalsExpanded(false);
    }
  }, [isIncomeExpanded]);

  const toggleExpensesSection = useCallback(() => {
    const newState = !isExpensesExpanded;
    setIsExpensesExpanded(newState);
    if (newState) {
      setIsIncomeExpanded(false);
      setIsGoalsExpanded(false);
    }
  }, [isExpensesExpanded]);

  const toggleGoalsSection = useCallback(() => {
    const newState = !isGoalsExpanded;
    setIsGoalsExpanded(newState);
    if (newState) {
      setIsIncomeExpanded(false);
      setIsExpensesExpanded(false);
    }
  }, [isGoalsExpanded]);

  // Group toggle - accordion behavior (only one open at a time)
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? [] // Close if already open
        : [groupId] // Open only this one (close others)
    );
  }, []);

  // Income member toggle - accordion behavior (only one open at a time)
  const toggleIncomeMember = useCallback((memberId: string) => {
    setExpandedIncomeMembers((prev) =>
      prev.includes(memberId)
        ? [] // Close if already open
        : [memberId] // Open only this one (close others)
    );
  }, []);

  return {
    // Section expansion
    isIncomeExpanded,
    isExpensesExpanded,
    isGoalsExpanded,
    toggleIncomeSection,
    toggleExpensesSection,
    toggleGoalsSection,

    // Group/member expansion
    expandedGroups,
    expandedIncomeMembers,
    toggleGroup,
    toggleIncomeMember,
    setExpandedGroups,
    setExpandedIncomeMembers,

    // Mobile view mode
    mobileViewMode,
    setMobileViewMode,
  };
}
