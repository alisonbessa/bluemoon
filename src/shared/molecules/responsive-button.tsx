"use client";

import { cn } from "@/shared/lib/utils";
import { Button, type buttonVariants } from "@/shared/ui/button";
import type { VariantProps } from "class-variance-authority";

interface ResponsiveButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  icon: React.ReactNode;
  children: React.ReactNode;
  breakpoint?: "sm" | "md";
  asChild?: boolean;
}

export function ResponsiveButton({
  icon,
  children,
  breakpoint = "sm",
  className,
  ...props
}: ResponsiveButtonProps) {
  // Mobile: full width, Tablet+: auto width on the right
  const responsiveWidth = breakpoint === "sm" ? "w-full sm:w-auto" : "w-full md:w-auto";

  return (
    <Button className={cn(responsiveWidth, className)} {...props}>
      <span className="h-4 w-4 mr-2">{icon}</span>
      <span>{children}</span>
    </Button>
  );
}
