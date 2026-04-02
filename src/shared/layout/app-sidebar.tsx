"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboardIcon,
  TargetIcon,
  ListIcon,
  ReceiptIcon,
  CreditCardIcon,
  BarChart3Icon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UserIcon,
  UsersIcon,
  LayersIcon,
  LockIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/shared/ui/sidebar";
import { UserButton } from "@/shared/layout/user-button";
import { Button } from "@/shared/ui/button";
import { QuickAddTransaction } from "@/shared/layout/quick-add-transaction";
import { useViewMode, type ViewMode } from "@/shared/providers/view-mode-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    tutorialId: "nav-dashboard",
  },
  {
    href: "/app/budget",
    label: "Planejamento",
    icon: ListIcon,
    tutorialId: "nav-planning",
    requiresAccount: true,
  },
  {
    href: "/app/transactions",
    label: "Transações",
    icon: ReceiptIcon,
    tutorialId: "nav-transactions",
    requiresAccount: true,
  },
  {
    href: "/app/goals",
    label: "Metas",
    icon: TargetIcon,
    tutorialId: "nav-goals",
    requiresAccount: true,
  },
  {
    href: "/app/accounts",
    label: "Contas",
    icon: CreditCardIcon,
    tutorialId: "nav-accounts",
  },
  {
    href: "/app/insights",
    label: "Relatórios",
    icon: BarChart3Icon,
    tutorialId: "nav-insights",
    requiresAccount: true,
  },
  {
    href: "/app/settings",
    label: "Configurações",
    icon: SettingsIcon,
    tutorialId: "nav-settings",
  },
];

const viewModeOptions: {
  value: ViewMode;
  label: string;
  icon: typeof UserIcon;
}[] = [
  { value: "mine", label: "Pessoal", icon: UserIcon },
  { value: "shared", label: "Compartilhado", icon: UsersIcon },
  { value: "all", label: "Tudo", icon: LayersIcon },
];

function ViewModeSelector() {
  const { viewMode, setViewMode, isDuoPlan, isUnifiedPrivacy, privacyMode, hasContributionModel } = useViewMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const pathname = usePathname();

  // Hide toggle: not duo, unified privacy, no contribution model, or on settings page
  if (!isDuoPlan || isUnifiedPrivacy || !hasContributionModel || pathname === "/app/settings") return null;

  // When privacy is "private", exclude the "all" option (partner data is hidden)
  const availableOptions = privacyMode === "private"
    ? viewModeOptions.filter((o) => o.value !== "all")
    : viewModeOptions;

  const activeOption = availableOptions.find((o) => o.value === viewMode) ?? availableOptions[0];
  const ActiveIcon = activeOption.icon;

  if (isCollapsed) {
    return (
      <div className="flex justify-center py-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center size-8 rounded-md hover:bg-muted transition-colors">
                  <ActiveIcon className="size-4" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{activeOption.label}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start">
            {availableOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setViewMode(option.value)}
                >
                  <Icon className="size-4 mr-2" />
                  {option.label}
                  {viewMode === option.value && (
                    <CheckIcon className="size-3.5 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50 transition-colors">
            <ActiveIcon className="size-4 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-sm">{activeOption.label}</span>
            <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
          {availableOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setViewMode(option.value)}
              >
                <Icon className="size-4 mr-2" />
                {option.label}
                {viewMode === option.value && (
                  <CheckIcon className="size-3.5 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarToggle() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className={cn("flex w-full", isCollapsed ? "justify-center" : "justify-end px-2")}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="size-8"
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
      >
        {isCollapsed ? (
          <PanelLeftOpenIcon className="size-4" />
        ) : (
          <PanelLeftCloseIcon className="size-4" />
        )}
      </Button>
    </div>
  );
}

function SidebarUserMenu() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "")}>
      <UserButton compact={isCollapsed} />
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: checklist } = useSWR<{ hasAccount: boolean }>("/api/app/onboarding/checklist");
  const hasAccount = checklist?.hasAccount ?? true; // default to true while loading

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      side="left"
      mobileSide="right"
      className="top-14 h-[calc(100svh-3.5rem)]"
    >
      {/* Toggle button at the top - hidden on mobile */}
      <SidebarHeader className="hidden md:flex items-center py-2">
        <SidebarToggle />
      </SidebarHeader>

      <SidebarContent className="pt-0">
        {/* View Mode Selector */}
        <ViewModeSelector />
        {/* Quick Add Transaction */}
        <QuickAddTransaction />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);
                const isLocked = item.requiresAccount && !hasAccount;

                if (isLocked) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={false}
                            className="opacity-40 cursor-not-allowed"
                          >
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                            <LockIcon className="size-3 ml-auto text-muted-foreground" />
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Adicione uma conta primeiro</p>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} data-tutorial={item.tutorialId} onClick={handleNavClick}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
