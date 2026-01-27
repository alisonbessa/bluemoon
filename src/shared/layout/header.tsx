"use client";

import Link from "next/link";
import { appConfig } from "@/shared/lib/config";
import { Button } from "@/shared/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "@/shared/theme-switcher";

const navItems: { label: string; href: string }[] = [
  // { label: "Pricing", href: "/#pricing" },
];

const CTAText = "Começar";
const CTAHref = "/#pricing";

const signInEnabled = process.env.NEXT_PUBLIC_SIGNIN_ENABLED === "true";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-lg font-bold">{appConfig.projectName}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center space-x-4 md:flex">
            <ThemeSwitcher />
            {signInEnabled && (
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Entrar
              </Link>
            )}
            <Button asChild>
              <Link href={CTAHref}>{CTAText}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            <ThemeSwitcher />
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Abrir menu principal</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="border-t border-border/40 md:hidden">
            <div className="flex flex-col gap-2 px-4 py-3">
              {signInEnabled && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/sign-in">Entrar</Link>
                </Button>
              )}
              <Button className="w-full" asChild>
                <Link href={CTAHref}>{CTAText}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
