"use client";

import Link from "next/link";
import Image from "next/image";
import { MenuIcon } from "lucide-react";
import { useSidebar } from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";
import { useViewMode, type ViewMode } from "@/shared/providers/view-mode-provider";
import { cn } from "@/shared/lib/utils";
import { usePathname } from "next/navigation";

const viewModeOptions: { value: ViewMode; label: string; shortLabel: string }[] = [
  { value: "mine", label: "Meu", shortLabel: "Meu" },
  { value: "shared", label: "Nosso", shortLabel: "Nosso" },
  { value: "all", label: "Tudo", shortLabel: "Tudo" },
];

function ViewModeToggle() {
  const { viewMode, setViewMode, isDuoPlan, isUnifiedPrivacy } = useViewMode();
  const pathname = usePathname();

  if (!isDuoPlan || isUnifiedPrivacy || pathname === "/app/settings") return null;

  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
      {viewModeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setViewMode(option.value)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
            "sm:px-3 sm:text-sm",
            viewMode === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="sm:hidden">{option.shortLabel}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

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
        <span className="text-sm sm:text-lg font-bold hidden sm:inline">
          {appConfig.projectName}
        </span>
      </Link>

      {/* View Mode Toggle - centered */}
      <div className="flex-1 flex justify-center">
        <ViewModeToggle />
      </div>

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
