"use client";

import { cn } from "@/shared/lib/utils";

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: "default" | "positive" | "negative";
  tooltip?: React.ReactNode;
  /** Optional supporting text below the value */
  subtitle?: string;
  className?: string;
}

const valueColorClasses = {
  default: "",
  positive: "text-success",
  negative: "text-destructive",
} as const;

export function SummaryCard({
  icon,
  label,
  value,
  valueColor = "default",
  tooltip,
  subtitle,
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "cartoon-panel rounded-cartoon border bg-card p-3 sm:p-4",
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center sm:h-4 sm:w-4">
          {icon}
        </span>
        <span className="truncate">{label}</span>
        {tooltip}
      </div>
      <div
        className={cn(
          "mt-2 text-center text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl",
          valueColorClasses[valueColor]
        )}
      >
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
