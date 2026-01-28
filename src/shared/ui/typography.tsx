import { cn } from "@/shared/lib/utils";
import { Slot } from "@radix-ui/react-slot";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

/**
 * Page title - largest heading
 * Mobile: 24px (text-2xl) → Desktop: 30px (text-3xl)
 */
export function PageTitle({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "h1";
  return (
    <Comp
      className={cn("text-2xl sm:text-3xl font-bold tracking-tight", className)}
      {...props}
    />
  );
}

/**
 * Section title - card headers, section headers
 * Mobile: 18px (text-lg) → Desktop: 20px (text-xl)
 */
export function SectionTitle({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "h2";
  return (
    <Comp
      className={cn("text-lg sm:text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

/**
 * Card title - smaller section headers
 * Mobile: 16px (text-base) → Desktop: 18px (text-lg)
 */
export function CardTitleText({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "h3";
  return (
    <Comp
      className={cn("text-base sm:text-lg font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Body text - regular paragraphs
 * Mobile: 14px (text-sm) → Desktop: 16px (text-base)
 */
export function Text({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "p";
  return (
    <Comp
      className={cn("text-sm sm:text-base", className)}
      {...props}
    />
  );
}

/**
 * Muted text - descriptions, subtitles
 * Mobile: 14px (text-sm) → Desktop: 16px (text-base)
 */
export function MutedText({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "p";
  return (
    <Comp
      className={cn("text-sm sm:text-base text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Small text - captions, labels, hints
 * Mobile: 12px (text-xs) → Desktop: 14px (text-sm)
 */
export function SmallText({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      className={cn("text-xs sm:text-sm", className)}
      {...props}
    />
  );
}

/**
 * Large value - monetary values, stats
 * Mobile: 24px (text-2xl) → Desktop: 30px (text-3xl)
 */
export function LargeValue({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      className={cn("text-2xl sm:text-3xl font-bold tabular-nums", className)}
      {...props}
    />
  );
}

/**
 * Medium value - secondary monetary values
 * Mobile: 20px (text-xl) → Desktop: 24px (text-2xl)
 */
export function MediumValue({ className, asChild, ...props }: TypographyProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      className={cn("text-xl sm:text-2xl font-semibold tabular-nums", className)}
      {...props}
    />
  );
}
