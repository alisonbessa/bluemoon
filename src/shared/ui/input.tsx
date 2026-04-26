import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const inputVariants = cva(
  cn(
    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
    "flex w-full min-w-0 rounded-md bg-card px-3 text-base outline-hidden",
    "border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-cartoon-xs)] transition-[box-shadow,transform] duration-150",
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "focus-visible:shadow-[var(--shadow-cartoon-sm)] focus-visible:-translate-x-px focus-visible:-translate-y-px",
    "aria-invalid:border-destructive aria-invalid:shadow-[2px_2px_0_0_var(--destructive)]"
  ),
  {
    variants: {
      size: {
        default: "h-9 py-1",
        sm: "h-8 py-1 text-sm",
        lg: "h-11 py-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
