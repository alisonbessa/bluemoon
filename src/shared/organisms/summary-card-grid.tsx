"use client";

import { cn } from "@/shared/lib/utils";
import { SummaryCard } from "@/shared/molecules/summary-card";

interface SummaryCardItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: "default" | "positive" | "negative";
  tooltip?: React.ReactNode;
  subtitle?: string;
}

interface SummaryCardGridProps {
  items: SummaryCardItem[];
  cols?: 2 | 3;
  className?: string;
}

const colsClasses = {
  2: "grid-cols-2",
  3: "grid-cols-3",
} as const;

export function SummaryCardGrid({
  items,
  cols = 3,
  className,
}: SummaryCardGridProps) {
  return (
    <div
      className={cn("grid gap-2 sm:gap-4", colsClasses[cols], className)}
    >
      {items.map((item) => (
        <SummaryCard
          key={item.id}
          icon={item.icon}
          label={item.label}
          value={item.value}
          valueColor={item.valueColor}
          tooltip={item.tooltip}
          subtitle={item.subtitle}
        />
      ))}
    </div>
  );
}
