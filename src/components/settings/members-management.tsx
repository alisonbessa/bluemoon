"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Crown,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  type: "owner" | "partner" | "child" | "pet";
  color: string | null;
  userId: string | null;
  monthlyPleasureBudget: number;
}

interface Invite {
  id: string;
  email: string;
  name: string | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
}

interface MembersManagementProps {
  budgetId: string;
}

const memberTypeLabels: Record<Member["type"], string> = {
  owner: "Dono",
  partner: "Parceiro(a)",
  child: "Filho(a)",
  pet: "Pet",
};

const memberTypeIcons: Record<Member["type"], React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-amber-500" />,
  partner: <Heart className="h-4 w-4 text-rose-500" />,
  child: <span>👶</span>,
  pet: <span>🐾</span>,
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function MembersManagement({ budgetId }: MembersManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/app/members?budgetId=${budgetId}`),
        fetch(`/api/app/invites?budgetId=${budgetId}`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error("Error fetching members data:", error);
      toast.error("Erro ao carregar dados de membros");
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    if (budgetId) {
      fetchData();
    }
  }, [budgetId, fetchData]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Digite um email valido");
      return;
    }

    setIsSendingInvite(true);
    try {
      const response = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetId,
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteLink(data.inviteLink);
        setInvites((prev) => [...prev, data.invite]);
        toast.success("Convite enviado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao enviar convite");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Erro ao enviar convite");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado!");
    }
  };

  const handleCancelInvite = async () => {
    if (!cancelInviteId) return;

    try {
      const response = await fetch(`/api/app/invites/${cancelInviteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== cancelInviteId));
        toast.success("Convite cancelado");
      } else {
        toast.error("Erro ao cancelar convite");
      }
    } catch (error) {
      console.error("Error canceling invite:", error);
      toast.error("Erro ao cancelar convite");
    } finally {
      setCancelInviteId(null);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
    setInviteLink(null);
  };

  const hasPartner = members.some((m) => m.type === "partner");
  const pendingInvites = invites.filter((i) => i.status === "pending");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
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
              <CardTitle>Membros do Orcamento</CardTitle>
            </div>
            {!hasPartner && pendingInvites.length === 0 && (
              <Button
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar Parceiro(a)
              </Button>
            )}
          </div>
          <CardDescription>
            Gerencie quem tem acesso ao seu orcamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Members List */}
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium"
                    style={{ backgroundColor: member.color || "#6366f1" }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {memberTypeIcons[member.type]}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {memberTypeLabels[member.type]}
                      </Badge>
                      {member.monthlyPleasureBudget > 0 && (
                        <span>
                          Prazeres: {formatCurrency(member.monthlyPleasureBudget)}/mes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Convites Pendentes
                </h4>
                {pendingInvites.map((invite) => {
                  const expiresAt = new Date(invite.expiresAt);
                  const isExpired = expiresAt < new Date();

                  return (
                    <div
                      key={invite.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3",
                        isExpired && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invite.email}</span>
                            {isExpired ? (
                              <Badge variant="destructive" className="text-xs">
                                Expirado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pendente
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isExpired
                              ? "Este convite expirou"
                              : `Expira em ${expiresAt.toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelInviteId(invite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Already has partner message */}
          {hasPartner && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Seu orcamento ja tem um(a) parceiro(a)</span>
            </div>
          )}

          {/* Has pending invite message */}
          {!hasPartner && pendingInvites.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Aguardando resposta do convite</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={closeInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Parceiro(a)</DialogTitle>
            <DialogDescription>
              Envie um convite para seu parceiro(a) participar do orcamento
            </DialogDescription>
          </DialogHeader>

          {!inviteLink ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="parceiro@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nome (opcional)</Label>
                <Input
                  id="invite-name"
                  placeholder="Nome do parceiro(a)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  Convite criado com sucesso!
                </p>
              </div>
              <div className="space-y-2">
                <Label>Link do convite</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe este link com seu parceiro(a). O convite expira em 7 dias.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {!inviteLink ? (
              <>
                <Button variant="outline" onClick={closeInviteModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSendInvite} disabled={isSendingInvite}>
                  {isSendingInvite ? "Enviando..." : "Enviar Convite"}
                </Button>
              </>
            ) : (
              <Button onClick={closeInviteModal}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Invite Confirmation */}
      <AlertDialog
        open={!!cancelInviteId}
        onOpenChange={() => setCancelInviteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link de convite sera invalidado e voce podera enviar um novo convite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
