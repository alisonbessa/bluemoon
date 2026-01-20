'use client';

import { useState, useCallback } from 'react';

type FilterType = 'all' | 'underfunded' | 'overfunded' | 'money_available';

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

  // Category selection
  selectedCategories: string[];
  toggleCategorySelection: (categoryId: string) => void;
  toggleGroupSelection: (categoryIds: string[]) => void;
  clearSelection: () => void;
  setSelectedCategories: (categories: string[]) => void;

  // Filters
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
}

interface UseBudgetUIStateOptions {
  /** Default section to expand. Defaults to 'income' */
  defaultExpandedSection?: 'income' | 'expenses' | 'goals' | 'none';
}

/**
 * Hook for managing budget page UI state
 *
 * Handles:
 * - Section accordion state (income/expenses/goals)
 * - Group and member expansion
 * - Category selection for bulk actions
 * - Filter state
 *
 * @example
 * ```tsx
 * const {
 *   isIncomeExpanded,
 *   toggleIncomeSection,
 *   selectedCategories,
 *   toggleCategorySelection,
 *   activeFilter,
 *   setActiveFilter,
 * } = useBudgetUIState();
 * ```
 */
export function useBudgetUIState(options: UseBudgetUIStateOptions = {}): UseBudgetUIStateReturn {
  const { defaultExpandedSection = 'income' } = options;

  // Section expansion state
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(defaultExpandedSection === 'income');
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(defaultExpandedSection === 'expenses');
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(defaultExpandedSection === 'goals');

  // Group/member expansion
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedIncomeMembers, setExpandedIncomeMembers] = useState<string[]>([]);

  // Category selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  // Group toggle
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  // Income member toggle
  const toggleIncomeMember = useCallback((memberId: string) => {
    setExpandedIncomeMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }, []);

  // Category selection
  const toggleCategorySelection = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const toggleGroupSelection = useCallback((categoryIds: string[]) => {
    setSelectedCategories((prev) => {
      const allSelected = categoryIds.every((id) => prev.includes(id));
      if (allSelected) {
        // Deselect all categories in this group
        return prev.filter((id) => !categoryIds.includes(id));
      } else {
        // Select all categories in this group
        return [...new Set([...prev, ...categoryIds])];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCategories([]);
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

    // Category selection
    selectedCategories,
    toggleCategorySelection,
    toggleGroupSelection,
    clearSelection,
    setSelectedCategories,

    // Filters
    activeFilter,
    setActiveFilter,
  };
}
