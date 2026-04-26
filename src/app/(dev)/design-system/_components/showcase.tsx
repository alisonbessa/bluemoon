import { cn } from "@/shared/lib/utils";

interface ShowcaseProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Showcase({ title, description, children, className }: ShowcaseProps) {
  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div
        className={cn(
          "rounded-lg border bg-card p-6 shadow-sm",
          className
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8 space-y-1">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}
