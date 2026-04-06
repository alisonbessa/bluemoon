"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  UsersRound,
  MessageSquare,
  MessageSquarePlus,
  LogOut,
  ClipboardList,
  Menu,
  Ticket,
  Bot,
  Database,
  Link as LinkIcon,
  Rocket,
  FileText,
  Sparkles,
} from "lucide-react";
import { ThemeSwitcher } from "@/shared/theme-switcher";
import { appConfig } from "@/shared/lib/config";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { name: "Painel", href: "/super-admin", icon: LayoutDashboard },
      { name: "Planos", href: "/super-admin/plans", icon: CreditCard },
      { name: "Lifetime Deal", href: "/super-admin/coupons", icon: Ticket },
      { name: "Links de Acesso", href: "/super-admin/access-links", icon: LinkIcon },
    ],
  },
  {
    label: "Usuarios",
    items: [
      { name: "Todos", href: "/super-admin/users", icon: Users },
      { name: "Segmentos", href: "/super-admin/segments", icon: UsersRound },
      { name: "Lista de Espera", href: "/super-admin/waitlist", icon: ClipboardList },
    ],
  },
  {
    label: "IA & Automacao",
    items: [
      { name: "WhatsApp IA", href: "/super-admin/telegram-ai", icon: Bot },
      { name: "Chat IA", href: "/super-admin/chat-logs", icon: Sparkles },
    ],
  },
  {
    label: "Comunicacao",
    items: [
      { name: "Mensagens", href: "/super-admin/messages", icon: MessageSquare },
      { name: "Feedback", href: "/super-admin/feedback", icon: MessageSquarePlus },
      { name: "Blog", href: "/super-admin/blog", icon: FileText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { name: "Migracoes", href: "/super-admin/migrations", icon: Rocket },
      { name: "Banco de Dados", href: "/super-admin/database", icon: Database },
      { name: "Sair", href: "/super-admin/logout", icon: LogOut },
    ],
  },
];

// Flat list for mobile dropdown
const allNavItems = navigationGroups.flatMap((g) => g.items);

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {navigationGroups.map((group, gi) => (
                <React.Fragment key={group.label}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-1 items-center justify-between">
            <Link href="/super-admin" className="font-semibold">
              {appConfig.projectName} - Administracao
            </Link>
            <div className="flex items-center gap-4">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Side Navigation - Desktop Only (Fixed) */}
        <aside className="hidden md:block w-56 border-r border-border/40 bg-background overflow-y-auto shrink-0">
          <nav className="p-3 space-y-4">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "group flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="mr-2.5 h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content (Scrollable) */}
        <main className="flex-1 w-full overflow-y-auto">
          <div className="px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
