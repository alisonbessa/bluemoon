"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  TargetIcon,
  ListIcon,
  ReceiptIcon,
  CreditCardIcon,
  SettingsIcon,
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
} from "@/components/ui/sidebar";
import { UserButton } from "@/components/layout/user-button";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    tutorialId: "nav-dashboard",
  },
  {
    href: "/app/goals",
    label: "Metas",
    icon: TargetIcon,
    tutorialId: "nav-goals",
  },
  {
    href: "/app/budget",
    label: "Planejamento",
    icon: ListIcon,
    tutorialId: "nav-planning",
  },
  {
    href: "/app/transactions",
    label: "Transacoes",
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

function SidebarLogo() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Link href="/app" className="flex items-center gap-2 px-2 py-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
        {appConfig.projectName.charAt(0)}
      </div>
      <span
        className={cn(
          "text-lg font-bold transition-opacity duration-200",
          isCollapsed ? "opacity-0 hidden" : "opacity-100"
        )}
      >
        {appConfig.projectName}
      </span>
    </Link>
  );
}

function SidebarUserMenu() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "px-2")}>
      <UserButton compact={isCollapsed} />
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} data-tutorial={item.tutorialId}>
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
