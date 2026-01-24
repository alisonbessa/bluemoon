'use client';

import { useState, useCallback } from 'react';

interface UseBudgetPeriodReturn {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  handleMonthChange: (year: number, month: number) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  isCurrentMonth: boolean;
}

/**
 * Hook for managing budget period (year/month) navigation
 *
 * @example
 * ```tsx
 * const { year, month, handleMonthChange } = useBudgetPeriod();
 *
 * return (
 *   <MonthSelector
 *     year={year}
 *     month={month}
 *     onChange={handleMonthChange}
 *   />
 * );
 * ```
 */
export function useBudgetPeriod(): UseBudgetPeriodReturn {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }, [year, month]);

  const goToNextMonth = useCallback(() => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }, [year, month]);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return {
    year,
    month,
    setYear,
    setMonth,
    handleMonthChange,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    isCurrentMonth,
  };
}
