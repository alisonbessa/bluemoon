import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ThemeSwitcher } from "@/shared/theme-switcher";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

const sections = [
  { href: "/design-system", label: "Visão geral" },
  { href: "/design-system/tokens", label: "Tokens" },
  { href: "/design-system/primitives", label: "Primitives" },
  { href: "/design-system/forms", label: "Forms" },
  { href: "/design-system/feedback", label: "Feedback" },
  { href: "/design-system/overlays", label: "Overlays" },
  { href: "/design-system/data", label: "Data display" },
  { href: "/design-system/molecules", label: "Molecules" },
];

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-10">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-56 lg:shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/design-system" className="font-semibold tracking-tight">
              Design System
            </Link>
            <ThemeSwitcher />
          </div>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {s.label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 hidden text-xs text-muted-foreground lg:block">
            Visível apenas em desenvolvimento.
          </p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
