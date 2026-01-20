"use client";

import { Button } from "@/shared/ui/button";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm bg-primary/10 text-primary rounded-full"
        >
          <span className="max-w-[150px] truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remover filtro ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {chips.length >= 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Limpar tudo
        </Button>
      )}
    </div>
  );
}
