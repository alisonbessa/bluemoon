"use client";

import { appConfig } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@/components/layout/user-button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  LayoutGridIcon,
  ReceiptIcon,
  CreditCardIcon,
  SettingsIcon,
} from "lucide-react";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    tutorialId: "nav-dashboard",
  },
  {
    href: "/app/planning",
    label: "Planejamento",
    icon: LayoutGridIcon,
    tutorialId: "nav-planning",
  },
  {
    href: "/app/transactions",
    label: "Transações",
    icon: ReceiptIcon,
    tutorialId: "nav-transactions",
  },
  {
    href: "/app/accounts",
    label: "Contas",
    icon: CreditCardIcon,
    tutorialId: "nav-accounts",
  },
  {
    href: "/app/settings",
    label: "Config",
    icon: SettingsIcon,
    tutorialId: "nav-settings",
  },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/app" className="flex items-center space-x-2">
              <span className="text-lg font-bold">{appConfig.projectName}</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tutorial={item.tutorialId}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <UserButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-t border-border/40 bg-background">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                data-tutorial={`${item.tutorialId}-mobile`}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
