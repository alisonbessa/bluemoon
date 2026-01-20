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

const breakpointClasses = {
  sm: {
    iconMargin: "sm:mr-2",
    textHidden: "hidden sm:inline",
  },
  md: {
    iconMargin: "md:mr-2",
    textHidden: "hidden md:inline",
  },
} as const;

export function ResponsiveButton({
  icon,
  children,
  breakpoint = "sm",
  className,
  ...props
}: ResponsiveButtonProps) {
  const classes = breakpointClasses[breakpoint];

  return (
    <Button className={className} {...props}>
      <span className={cn("h-4 w-4", classes.iconMargin)}>{icon}</span>
      <span className={classes.textHidden}>{children}</span>
    </Button>
  );
}
