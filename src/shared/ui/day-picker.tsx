"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { CalendarDays } from "lucide-react";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface DayPickerProps {
  value?: number;
  onChange: (day: number) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export function DayPicker({ value, onChange, placeholder = "Dia", disabled = false, hasError = false }: DayPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal h-9",
            !value && "text-muted-foreground",
            hasError && "border-destructive"
          )}
        >
          <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
          {value ? `Dia ${value}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                onChange(day);
                setOpen(false);
              }}
              className={cn(
                "h-8 w-8 rounded-md text-sm font-medium transition-colors",
                "hover:bg-primary/10",
                value === day
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
