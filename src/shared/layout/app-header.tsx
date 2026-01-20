"use client";

import Link from "next/link";
import { HexagonIcon, MenuIcon } from "lucide-react";
import { useSidebar } from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Logo and Name */}
      <Link href="/app" className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HexagonIcon className="size-5" />
        </div>
        <span className="text-lg font-bold">
          {appConfig.projectName}
        </span>
      </Link>

      <div className="flex-1" />

      {/* Mobile Sidebar Toggle - Hamburger icon on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="md:hidden size-8"
        title="Menu"
      >
        <MenuIcon className="size-5" />
      </Button>
    </header>
  );
}
