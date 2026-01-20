"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatCurrency } from "@/shared/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  Copy,
  Trash2,
  Crown,
  Heart,
  Share2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

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

export function MembersManagement({ budgetId }: MembersManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPreInviteModal, setShowPreInviteModal] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState<string>("");
  const [editingBudgetName, setEditingBudgetName] = useState<string>("");
  const [isSavingBudgetName, setIsSavingBudgetName] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, invitesRes, budgetRes] = await Promise.all([
        fetch(`/api/app/members?budgetId=${budgetId}`),
        fetch(`/api/app/invites?budgetId=${budgetId}`),
        fetch(`/api/app/budget?budgetId=${budgetId}`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }

      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudgetName(data.budget?.name || "");
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

  const handleOpenPreInvite = () => {
    setEditingBudgetName(budgetName);
    setShowPreInviteModal(true);
  };

  const handleSaveBudgetNameAndCreateInvite = async () => {
    setIsSavingBudgetName(true);

    try {
      // Only update budget name if it changed
      if (editingBudgetName.trim() && editingBudgetName !== budgetName) {
        const updateRes = await fetch("/api/app/budget", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetId, name: editingBudgetName.trim() }),
        });

        if (!updateRes.ok) {
          toast.error("Erro ao atualizar nome do orçamento");
          setIsSavingBudgetName(false);
          return;
        }

        setBudgetName(editingBudgetName.trim());
      }

      // Now create the invite
      await handleCreateInvite();
      setShowPreInviteModal(false);
    } catch (error) {
      console.error("Error saving budget name:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSavingBudgetName(false);
    }
  };

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    try {
      const response = await fetch("/api/app/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteLink(data.inviteLink);
        setInvites((prev) => [...prev, data.invite]);
        setShowInviteModal(true);
        toast.success("Link de convite criado!");
      } else {
        toast.error(data.error || "Erro ao criar convite");
      }
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
    } finally {
      setIsCreatingInvite(false);
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
    setInviteLink(null);
  };

  // Only count partners that are actually connected (have userId)
  const hasConnectedPartner = members.some((m) => m.type === "partner" && m.userId);
  // Partner placeholders from onboarding (no userId yet)
  const partnerPlaceholder = members.find((m) => m.type === "partner" && !m.userId);
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
              <CardTitle>Membros do Orçamento</CardTitle>
            </div>
            {!hasConnectedPartner && pendingInvites.length === 0 && (
              <Button
                size="sm"
                onClick={handleOpenPreInvite}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Criar link de convite
              </Button>
            )}
          </div>
          <CardDescription>
            Gerencie quem tem acesso ao seu orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Members List */}
          <div className="space-y-3">
            {members.map((member) => {
              const isPlaceholder = member.type === "partner" && !member.userId;

              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    isPlaceholder && "border-dashed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-white font-medium",
                        isPlaceholder && "opacity-50"
                      )}
                      style={{ backgroundColor: member.color || "#6366f1" }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", isPlaceholder && "text-muted-foreground")}>
                          {member.name}
                        </span>
                        {memberTypeIcons[member.type]}
                        {isPlaceholder && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            Não conectado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {memberTypeLabels[member.type]}
                        </Badge>
                        {member.monthlyPleasureBudget > 0 && (
                          <span>
                            Prazeres: {formatCurrency(member.monthlyPleasureBudget)}/mês
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isPlaceholder && pendingInvites.length === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenPreInvite}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Convidar
                    </Button>
                  )}
                </div>
              );
            })}
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

          {/* Already has connected partner message */}
          {hasConnectedPartner && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Seu orçamento já tem um(a) parceiro(a) conectado(a)</span>
            </div>
          )}

          {/* Has pending invite message */}
          {!hasConnectedPartner && pendingInvites.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Aguardando resposta do convite</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Link Modal */}
      <Dialog open={showInviteModal} onOpenChange={closeInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Convite</DialogTitle>
            <DialogDescription>
              Compartilhe este link com seu parceiro(a) para convidar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2" />
              <p className="font-medium text-green-700 dark:text-green-300">
                Link criado com sucesso!
              </p>
            </div>
            <div className="space-y-3">
              <Label>Link do convite</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Oi! Estou te convidando para participar do meu orçamento no HiveBudget. Clique no link para aceitar: ${inviteLink}`
                    );
                    window.open(`https://wa.me/?text=${message}`, "_blank");
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Qualquer pessoa com este link pode aceitar o convite. Expira em 7 dias.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={closeInviteModal}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Invite Modal - Edit Budget Name */}
      <Dialog open={showPreInviteModal} onOpenChange={setShowPreInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar para o Orçamento</DialogTitle>
            <DialogDescription>
              Revise o nome do seu orçamento antes de enviar o convite. É esse nome que seu parceiro(a) vai ver.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget-name">Nome do Orçamento</Label>
              <Input
                id="budget-name"
                value={editingBudgetName}
                onChange={(e) => setEditingBudgetName(e.target.value)}
                placeholder="Ex: Orçamento da Família Silva"
              />
              <p className="text-xs text-muted-foreground">
                Este nome aparecerá no convite e na página de aceitar convite.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPreInviteModal(false)}
              disabled={isSavingBudgetName || isCreatingInvite}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBudgetNameAndCreateInvite}
              disabled={isSavingBudgetName || isCreatingInvite || !editingBudgetName.trim()}
            >
              {isSavingBudgetName || isCreatingInvite ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Link de Convite
                </>
              )}
            </Button>
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
              O link de convite será invalidado e você poderá enviar um novo convite.
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
