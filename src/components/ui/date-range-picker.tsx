"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  triggerClassName?: string;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  triggerClassName,
  placeholder = "Selecionar período",
}: DateRangePickerProps) {
  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
    } else if (range?.from) {
      // Partial selection - waiting for end date
      onChange({ from: range.from, to: range.from });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9",
            value && "text-primary border-primary",
            triggerClassName
          )}
          title={placeholder}
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Período personalizado</p>
          {value && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(value.from, "dd/MMM/yyyy", { locale: ptBR })} -{" "}
              {format(value.to, "dd/MMM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
        <Calendar
          mode="range"
          selected={
            value
              ? { from: value.from, to: value.to }
              : undefined
          }
          onSelect={handleSelect}
          numberOfMonths={1}
          locale={ptBR}
        />
        {value && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => onChange(null)}
            >
              Limpar período
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
