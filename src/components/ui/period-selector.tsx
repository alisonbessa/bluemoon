"use client";

import { cn } from "@/lib/utils";

export type PeriodType = "week" | "month" | "year";

interface PeriodSelectorProps {
  value: PeriodType | "custom";
  onChange: (value: PeriodType) => void;
  hasCustomRange?: boolean;
  className?: string;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

export function PeriodSelector({
  value,
  onChange,
  hasCustomRange = false,
  className,
}: PeriodSelectorProps) {
  const isCustomActive = hasCustomRange || value === "custom";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-muted p-1",
        className
      )}
    >
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            value === option.value && !isCustomActive
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
      {isCustomActive && (
        <div className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground">
          Período
        </div>
      )}
    </div>
  );
}
