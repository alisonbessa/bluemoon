"use client";

import Link from "next/link";
import Image from "next/image";
import { MenuIcon } from "lucide-react";
import { useSidebar } from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
      {/* Logo and Name */}
      <Link href="/app" className="flex items-center gap-1.5 sm:gap-2">
        <Image
          src="/assets/logo.png"
          alt={appConfig.projectName}
          width={32}
          height={32}
          className="size-7 sm:size-8 rounded-lg"
        />
        <span className="text-sm sm:text-lg font-bold">
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
