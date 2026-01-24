"use client";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed bg-card p-6 sm:p-8 text-center",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex justify-center gap-2 mt-4">
          {secondaryAction && (
            <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
