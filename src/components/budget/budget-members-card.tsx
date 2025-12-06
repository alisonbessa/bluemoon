"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  Clock,
  X,
  Crown,
  Heart,
  Loader2,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { InviteMemberModal } from "./invite-member-modal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Member {
  id: string;
  name: string;
  type: "owner" | "partner" | "child" | "pet";
  color: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface Invite {
  id: string;
  email: string | null;
  name: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface BudgetMembersCardProps {
  budgetId: string;
  currentUserId: string;
}

const memberTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  owner: { label: "Organizador", icon: <Crown className="h-3 w-3" /> },
  partner: { label: "Parceiro", icon: <Heart className="h-3 w-3" /> },
  child: { label: "Dependente", icon: null },
  pet: { label: "Pet", icon: null },
};

export function BudgetMembersCard({ budgetId, currentUserId }: BudgetMembersCardProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch members
      const membersRes = await fetch(`/api/app/members?budgetId=${budgetId}`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

      // Fetch invites
      const invitesRes = await fetch(`/api/app/invites?budgetId=${budgetId}`);
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        // Filter only pending invites
        setInvites(
          (invitesData.invites || []).filter((i: Invite) => i.status === "pending")
        );
      }
    } catch (error) {
      console.error("Error fetching members/invites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [budgetId]);

  const handleCancelInvite = async (inviteId: string) => {
    setCancelingInvite(inviteId);
    try {
      const res = await fetch(`/api/app/invites/${inviteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao cancelar convite");
      }

      toast.success("Convite cancelado");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar convite");
    } finally {
      setCancelingInvite(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInvite(inviteId);
    try {
      const res = await fetch(`/api/app/invites/${inviteId}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao reenviar convite");
      }

      const data = await res.json();
      toast.success("Convite reenviado com sucesso");

      // Update the invite in the list
      setInvites((prev) =>
        prev.map((i) =>
          i.id === inviteId ? { ...i, expiresAt: data.invite.expiresAt } : i
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reenviar convite");
    } finally {
      setResendingInvite(null);
    }
  };

  const handleInviteCreated = () => {
    fetchData();
    setShowInviteModal(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Membros do Orçamento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Membros do Orçamento</CardTitle>
                <CardDescription>
                  {members.length} {members.length === 1 ? "membro" : "membros"}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowInviteModal(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Members list */}
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user?.id === currentUserId;
              const typeInfo = memberTypeLabels[member.type] || { label: member.type, icon: null };

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10" style={{ borderColor: member.color, borderWidth: 2 }}>
                      <AvatarImage src={member.user?.image || undefined} />
                      <AvatarFallback style={{ backgroundColor: member.color + "20", color: member.color }}>
                        {member.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            você
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {typeInfo.icon}
                        <span>{typeInfo.label}</span>
                        {member.user?.email && (
                          <span className="ml-1">• {member.user.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Convites Pendentes
                </h4>
                <div className="space-y-3">
                  {invites.map((invite) => {
                    const expiresAt = new Date(invite.expiresAt);
                    const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {invite.email || invite.name || "Convite por link"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expira{" "}
                            <span className={isExpiringSoon ? "text-amber-600" : ""}>
                              {formatDistanceToNow(expiresAt, {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {cancelingInvite === invite.id || resendingInvite === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResendInvite(invite.id)}
                              disabled={resendingInvite === invite.id}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reenviar convite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCancelInvite(invite.id)}
                              disabled={cancelingInvite === invite.id}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar convite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <InviteMemberModal
        budgetId={budgetId}
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInviteCreated={handleInviteCreated}
      />
    </>
  );
}
