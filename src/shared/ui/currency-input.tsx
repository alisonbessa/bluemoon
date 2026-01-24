"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /** Value in cents (e.g., 12345 = R$ 123,45) */
  value: number;
  /** Callback with value in cents */
  onChange: (valueInCents: number) => void;
  /** Show R$ prefix inside input */
  showPrefix?: boolean;
  /** Custom class for the wrapper */
  wrapperClassName?: string;
}

/**
 * Format cents to Brazilian currency display (e.g., 12345 -> "123,45")
 */
export function formatCentsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format cents to full Brazilian currency (e.g., 12345 -> "R$ 123,45")
 */
export function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Parse display string to cents (e.g., "123,45" -> 12345)
 */
export function parseDisplayToCents(display: string): number {
  const cleaned = display.replace(/[^\d,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

// Maximum value in cents (R$ 10,000,000,000.00 = R$ 10 billion)
const MAX_CENTS = 1_000_000_000_000;

/**
 * Format raw digit input to display format
 * As user types "12345", it shows "123,45"
 * Limits to MAX_CENTS to prevent overflow
 */
function formatDigitsToDisplay(digits: string): string {
  // Remove all non-digits
  const onlyDigits = digits.replace(/\D/g, "");
  // Parse as integer (cents), limited to MAX_CENTS
  const cents = Math.min(parseInt(onlyDigits || "0", 10), MAX_CENTS);
  return formatCentsToDisplay(cents);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      wrapperClassName,
      value,
      onChange,
      showPrefix = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState(
      formatCentsToDisplay(value)
    );

    // Sync display value when external value changes
    React.useEffect(() => {
      setDisplayValue(formatCentsToDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDigitsToDisplay(e.target.value);
      setDisplayValue(formatted);

      // Extract cents from formatted value (already limited by formatDigitsToDisplay)
      const cents = Math.min(parseInt(formatted.replace(/\D/g, "") || "0", 10), MAX_CENTS);
      onChange(cents);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Clear input on focus if it's zero
      if (value === 0) {
        setDisplayValue("");
      }
      // Select all text
      e.target.select();
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Ensure proper formatting on blur
      if (!displayValue.trim()) {
        setDisplayValue("0,00");
        onChange(0);
      }
      props.onBlur?.(e);
    };

    if (showPrefix) {
      return (
        <div className={cn("relative", wrapperClassName)}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            data-slot="input"
            className={cn(
              "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-hidden file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
              "pl-10 tabular-nums",
              className
            )}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-hidden file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "tabular-nums",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
