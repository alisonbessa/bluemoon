"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { ReactNode } from "react";

interface OnboardingCardProps {
  icon?: string | ReactNode;
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function OnboardingCard({
  icon,
  label,
  description,
  selected,
  disabled = false,
  onClick,
}: OnboardingCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
        "hover:border-primary/50",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {icon && (
        <span className="text-2xl flex-shrink-0">
          {typeof icon === "string" ? icon : icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium block">{label}</span>
        {description && (
          <span className="text-sm text-muted-foreground block mt-0.5">
            {description}
          </span>
        )}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}
