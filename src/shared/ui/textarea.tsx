import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md bg-card px-3 py-2 text-base outline-hidden",
        "border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-cartoon-xs)] transition-[box-shadow,transform] duration-150",
        "focus-visible:shadow-[var(--shadow-cartoon-sm)] focus-visible:-translate-x-px focus-visible:-translate-y-px",
        "aria-invalid:shadow-[2px_2px_0_0_var(--destructive)]",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
