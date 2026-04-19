"use client";

import { cn } from "@/shared/lib/utils";
import type { RoadmapStatus } from "@/db/schema/roadmap";
import { STATUS_LABELS, STATUS_STYLES } from "../types";

export function StatusBadge({
  status,
  className,
}: {
  status: RoadmapStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
