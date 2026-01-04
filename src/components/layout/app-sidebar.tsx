"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  TargetIcon,
  ListIcon,
  ReceiptIcon,
  CreditCardIcon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
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
import { Button } from "@/components/ui/button";

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
    <div className={cn("flex items-center", isCollapsed ? "justify-center" : "px-2")}>
      <UserButton compact={isCollapsed} />
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

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

      <SidebarContent className="pt-2">
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
