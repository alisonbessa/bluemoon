"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useUser } from "@/shared/hooks/use-current-user";
import Link from "next/link";
import {
  LayoutDashboard,
  CreditCard,
  LogOut,
  UserIcon,
  // Ticket, // TODO: reativar com o fluxo LTD
} from "lucide-react";

interface UserButtonProps {
  compact?: boolean;
}

export function UserButton({ compact = false }: UserButtonProps) {
  const { user } = useUser();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-hidden">
        <Avatar>
          <AvatarImage src={user?.image || undefined} />
          <AvatarFallback>
            {user?.name ? (
              getInitials(user.name)
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="text-sm font-medium">
            {user?.name || user?.email}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name || "-"}</p>
            {user?.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app" className="cursor-pointer">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/plan" className="cursor-pointer">
            <CreditCard className="h-4 w-4" />
            Gerenciar Plano
          </Link>
        </DropdownMenuItem>

        {/* TODO: ajustar fluxo de resgate LTD e reativar no futuro */}
        {/* <DropdownMenuItem asChild>
          <Link href="/app/redeem-ltd" className="cursor-pointer">
            <Ticket className="h-4 w-4" />
            Resgatar Cupom LTD
          </Link>
        </DropdownMenuItem> */}
        <DropdownMenuItem asChild>
          <Link href="/app/profile" className="cursor-pointer">
            <UserIcon className="h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/sign-out" className="cursor-pointer">
            <LogOut className="h-4 w-4" />
            Sair
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
