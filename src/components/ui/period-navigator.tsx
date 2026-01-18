"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  getWeek,
  getISOWeekYear,
  setWeek,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Get a date that represents the start of a given ISO week
 */
function getDateFromWeek(year: number, week: number): Date {
  // Start from January 4th of the year (always in week 1 of ISO week)
  const jan4 = new Date(year, 0, 4);
  // Set to the desired week
  const weekDate = setWeek(jan4, week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const result = startOfWeek(weekDate, { weekStartsOn: 1 });

  console.log("[getDateFromWeek]", { year, week, jan4: jan4.toISOString(), weekDate: weekDate.toISOString(), result: result.toISOString() });

  return result;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type PeriodType = "week" | "month" | "year";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PeriodValue {
  year: number;
  month: number; // 1-12
  week?: number; // ISO week number
}

interface PeriodNavigatorProps {
  type: PeriodType;
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  customRange?: DateRange | null;
  onClearCustomRange?: () => void;
  showTodayButton?: boolean;
  className?: string;
}

export function PeriodNavigator({
  type,
  value,
  onChange,
  customRange,
  onClearCustomRange,
  showTodayButton = true,
  className,
}: PeriodNavigatorProps) {
  const today = new Date();

  // Check if we're in the current period
  const isCurrentPeriod = (() => {
    if (customRange) return false;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentWeek = getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });

    switch (type) {
      case "week":
        return value.year === currentYear && value.week === currentWeek;
      case "month":
        return value.year === currentYear && value.month === currentMonth;
      case "year":
        return value.year === currentYear;
    }
  })();

  const handlePrev = () => {
    if (customRange) return;

    switch (type) {
      case "week": {
        // Get the current week's start date using the week number
        const currentWeekNum = value.week || getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        const currentWeekStart = getDateFromWeek(value.year, currentWeekNum);
        const prevWeekDate = subWeeks(currentWeekStart, 1);
        const newWeek = getWeek(prevWeekDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        console.log("[PeriodNavigator] handlePrev week:", {
          input: { year: value.year, week: currentWeekNum },
          currentWeekStart: currentWeekStart.toISOString(),
          prevWeekDate: prevWeekDate.toISOString(),
          output: { year: getISOWeekYear(prevWeekDate), month: prevWeekDate.getMonth() + 1, week: newWeek },
        });

        onChange({
          year: getISOWeekYear(prevWeekDate),
          month: prevWeekDate.getMonth() + 1,
          week: newWeek,
        });
        break;
      }
      case "month": {
        if (value.month === 1) {
          onChange({ year: value.year - 1, month: 12 });
        } else {
          onChange({ year: value.year, month: value.month - 1 });
        }
        break;
      }
      case "year": {
        onChange({ year: value.year - 1, month: value.month });
        break;
      }
    }
  };

  const handleNext = () => {
    if (customRange) return;

    switch (type) {
      case "week": {
        // Get the current week's start date using the week number
        const currentWeekNum = value.week || getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        const currentWeekStart = getDateFromWeek(value.year, currentWeekNum);
        const nextWeekDate = addWeeks(currentWeekStart, 1);
        const newWeek = getWeek(nextWeekDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });

        console.log("[PeriodNavigator] handleNext week:", {
          input: { year: value.year, week: currentWeekNum },
          currentWeekStart: currentWeekStart.toISOString(),
          nextWeekDate: nextWeekDate.toISOString(),
          output: { year: getISOWeekYear(nextWeekDate), month: nextWeekDate.getMonth() + 1, week: newWeek },
        });

        onChange({
          year: getISOWeekYear(nextWeekDate),
          month: nextWeekDate.getMonth() + 1,
          week: newWeek,
        });
        break;
      }
      case "month": {
        if (value.month === 12) {
          onChange({ year: value.year + 1, month: 1 });
        } else {
          onChange({ year: value.year, month: value.month + 1 });
        }
        break;
      }
      case "year": {
        onChange({ year: value.year + 1, month: value.month });
        break;
      }
    }
  };

  const goToToday = () => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentWeek = getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });

    onChange({
      year: currentYear,
      month: currentMonth,
      week: currentWeek,
    });
  };

  const formatPeriodLabel = () => {
    if (customRange) {
      return `${format(customRange.from, "dd/MMM", { locale: ptBR })} - ${format(customRange.to, "dd/MMM", { locale: ptBR })}`;
    }

    switch (type) {
      case "week": {
        const weekNum = value.week || getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        // Show the week date range for better clarity
        const weekStart = getDateFromWeek(value.year, weekNum);
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        return `${format(weekStart, "dd/MMM", { locale: ptBR })} - ${format(weekEnd, "dd/MMM", { locale: ptBR })}`;
      }
      case "month":
        return MONTH_NAMES[value.month - 1];
      case "year":
        return value.year.toString();
    }
  };

  const formatSubLabel = () => {
    if (customRange) return null;

    switch (type) {
      case "week":
        return value.year.toString();
      case "month":
        return value.year.toString();
      case "year":
        return null;
    }
  };

  const subLabel = formatSubLabel();

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {showTodayButton && !isCurrentPeriod && !customRange && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="mr-1"
        >
          Hoje
        </Button>
      )}

      {customRange ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md">
          <span className="text-sm font-medium">{formatPeriodLabel()}</span>
          {onClearCustomRange && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-primary/20"
              onClick={onClearCustomRange}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center min-w-[120px]">
            <span className="text-lg font-semibold">{formatPeriodLabel()}</span>
            {subLabel && (
              <span className="text-xs text-muted-foreground">{subLabel}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export { MONTH_NAMES };

/**
 * Calculate date range based on period type and value
 */
export function calculateDateRange(
  type: PeriodType,
  value: PeriodValue,
  customRange?: DateRange | null
): { startDate: Date; endDate: Date } {
  if (customRange) {
    return { startDate: customRange.from, endDate: customRange.to };
  }

  switch (type) {
    case "week": {
      // Use the week number to get the correct date range
      const weekNum = value.week || getWeek(new Date(), { weekStartsOn: 1, firstWeekContainsDate: 4 });
      const weekStart = getDateFromWeek(value.year, weekNum);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return { startDate: weekStart, endDate: weekEnd };
    }
    case "month": {
      const startDate = new Date(value.year, value.month - 1, 1);
      const endDate = new Date(value.year, value.month, 0); // Last day of month
      return { startDate, endDate };
    }
    case "year": {
      const startDate = new Date(value.year, 0, 1);
      const endDate = new Date(value.year, 11, 31);
      return { startDate, endDate };
    }
  }
}
