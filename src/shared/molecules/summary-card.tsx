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
  positive: "text-green-600",
  negative: "text-red-600",
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
    <div className={cn("rounded-lg border bg-card p-2 sm:p-3", className)}>
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
        <span className="h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="truncate">{label}</span>
        {tooltip}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold text-center",
          valueColorClasses[valueColor]
        )}
      >
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground text-center">{subtitle}</p>
      )}
    </div>
  );
}
