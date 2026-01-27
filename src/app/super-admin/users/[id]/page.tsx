"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
  ArrowLeft,
  Trash2,
  User,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { plans } from "@/db/schema/plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Plus, Minus, CreditCard } from "lucide-react";
import { enableCredits } from "@/shared/lib/credits/config";

type UserRole = "user" | "beta" | "lifetime" | "admin";

interface UserDetails {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  emailVerified: string | null;
  role: UserRole;
  trialEndsAt: string | null;
  currentPlan: typeof plans.$inferSelect | null;
  stripeSubscriptionId: string | null;
  lemonSqueezySubscriptionId: string | null;
}

interface Plan {
  id: string;
  name: string;
  codename: string;
  default: boolean;
}

interface CreditTransaction {
  id: string;
  creditType: string;
  transactionType: "credit" | "debit" | "expired";
  amount: number;
  createdAt: string;
  metadata?: {
    reason?: string;
    adminAction?: boolean;
    adminEmail?: string;
  };
}

interface CreditData {
  currentCredits: Record<string, number>;
  transactions: CreditTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function UserDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [impersonationUrl, setImpersonationUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Credit management state
  const [creditPage, setCreditPage] = useState(1);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAction, setCreditAction] = useState<"add" | "deduct">("add");
  const [creditType, setCreditType] = useState<
    "image_generation" | "video_generation"
  >("image_generation");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [isProcessingCredit, setIsProcessingCredit] = useState(false);

  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR<UserDetails>(`/api/super-admin/users/${id}`);

  const { data: plansData } = useSWR<{ plans: Plan[] }>(
    "/api/super-admin/plans?limit=100"
  );

  const { data: creditData, mutate: mutateCreditData } = useSWR<CreditData>(
    `/api/super-admin/users/${id}/credits?page=${creditPage}&limit=10`
  );

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleImpersonate = async () => {
    try {
      const response = await fetch(`/api/super-admin/users/${id}/impersonate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create impersonation link");
      }

      const { url } = await response.json();
      setImpersonationUrl(url);
      setIsModalOpen(true);
    } catch (error) {
      toast.error("Falha ao personificar usuário");
      console.error("Impersonation error:", error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(impersonationUrl);
      setIsCopied(true);
      toast.success("Link copiado!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Falha ao copiar link");
      console.error("Copy error:", error);
    }
  };

  const handleDirectAccess = () => {
    setIsModalOpen(false);
    window.open(impersonationUrl, "_blank");
  };

  const handlePlanChange = async (planId: string) => {
    try {
      setIsUpdatingPlan(true);
      const response = await fetch(`/api/super-admin/users/${id}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan");
      }

      await mutate();
      toast.success("Plano atualizado com sucesso");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Falha ao atualizar plano");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    try {
      setIsUpdatingRole(true);
      const response = await fetch(`/api/super-admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      const roleLabels: Record<UserRole, string> = {
        user: "Usuário",
        beta: "Beta",
        lifetime: "Vitalício",
        admin: "Admin",
      };
      await mutate();
      toast.success(`Tipo alterado para ${roleLabels[role]}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Falha ao alterar tipo de usuário");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleCreditSubmit = async () => {
    if (!creditAmount || !creditReason || parseFloat(creditAmount) <= 0) {
      toast.error("Informe uma quantidade válida (> 0) e um motivo");
      return;
    }

    try {
      setIsProcessingCredit(true);
      const response = await fetch(`/api/super-admin/users/${id}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: creditAction,
          creditType,
          amount: parseFloat(creditAmount),
          reason: creditReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to manage credits");
      }

      await mutateCreditData();
      toast.success(result.message);

      // Reset form
      setCreditAmount("");
      setCreditReason("");
      setIsCreditModalOpen(false);
    } catch (error) {
      console.error("Error managing credits:", error);
      toast.error(
        error instanceof Error ? error.message : "Falha ao gerenciar créditos"
      );
    } finally {
      setIsProcessingCredit(false);
    }
  };

  const formatCreditType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="text-center">
          <h2 className="text-lg font-medium">Erro ao carregar usuário</h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os detalhes do usuário. Tente novamente.
          </p>
          <Button variant="ghost" size="sm" asChild className="mt-4">
            <Link href="/super-admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Usuários
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="text-center">
          <h2 className="text-lg font-medium">Carregando...</h2>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto carregamos os detalhes do usuário.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {enableCredits && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditModalOpen(true)}
            >
              <CreditCard className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Gerenciar Créditos</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleImpersonate}>
            <User className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Personificar</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => router.push(`/super-admin/users/${id}/delete`)}
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excluir Usuário</span>
          </Button>
        </div>
      </div>

      {/* Modal de Link de Personificação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Personificação Gerado</DialogTitle>
            <DialogDescription>
              Abra este link em uma janela anônima para personificar{" "}
              {user?.name || user?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Aviso de Segurança
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Este link concede acesso temporário à conta de {user?.email}.
                  Manuseie com cuidado:
                </p>
                <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 mt-1">
                  <li>Use apenas em navegação anônima/privada</li>
                  <li>Não compartilhe com pessoas não autorizadas</li>
                  <li>O link expira em 30 minutos</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <label htmlFor="impersonation-link" className="sr-only">
                Link de Personificação
              </label>
              <Input
                id="impersonation-link"
                value={impersonationUrl}
                readOnly
                className="font-mono text-xs"
              />
            </div>
            <Button type="button" size="sm" onClick={copyToClipboard}>
              {isCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Fechar
            </Button>
            <Button type="button" size="sm" onClick={handleDirectAccess}>
              Abrir Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Gerenciamento de Créditos */}
      <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Créditos do Usuário</DialogTitle>
            <DialogDescription>
              Adicionar ou deduzir créditos para {user?.name || user?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="credit-action">Ação</Label>
              <RadioGroup
                value={creditAction}
                onValueChange={(value: "add" | "deduct") =>
                  setCreditAction(value)
                }
                className="flex flex-row gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="flex items-center gap-1">
                    <Plus className="h-4 w-4 text-green-600" />
                    Adicionar Créditos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deduct" id="deduct" />
                  <Label htmlFor="deduct" className="flex items-center gap-1">
                    <Minus className="h-4 w-4 text-red-600" />
                    Deduzir Créditos
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="credit-type">Tipo de Crédito</Label>
              <Select
                value={creditType}
                onValueChange={(
                  value: "image_generation" | "video_generation"
                ) => setCreditType(value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image_generation">
                    Geração de Imagem
                  </SelectItem>
                  <SelectItem value="video_generation">
                    Geração de Vídeo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="credit-amount">Quantidade *</Label>
              <Input
                id="credit-amount"
                type="number"
                min="1"
                step="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Informe a quantidade (deve ser > 0)"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="credit-reason">Motivo *</Label>
              <Textarea
                id="credit-reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Informe o motivo desta transação de créditos"
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsCreditModalOpen(false)}
              disabled={isProcessingCredit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreditSubmit}
              disabled={
                isProcessingCredit ||
                !creditAmount ||
                !creditReason ||
                parseFloat(creditAmount) <= 0
              }
            >
              {isProcessingCredit
                ? "Processando..."
                : `${creditAction === "add" ? "Adicionar" : "Deduzir"} Créditos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil do Usuário</CardTitle>
            <CardDescription>Informações básicas sobre o usuário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback>
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || user?.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {user?.name || "Usuário sem nome"}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  ID do Usuário
                </dt>
                <dd className="text-sm font-mono mt-1">{user?.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Cadastro
                </dt>
                <dd className="text-sm mt-1">
                  {formatDate(user?.createdAt || null)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email Verificado
                </dt>
                <dd className="text-sm mt-1">
                  {user?.emailVerified ? formatDate(user.emailVerified) : "Não"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Trial Termina em
                </dt>
                <dd className="text-sm mt-1">
                  {user?.trialEndsAt ? formatDate(user.trialEndsAt) : "N/A"}
                </dd>
              </div>
            </dl>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-muted-foreground">
                Tipo de Usuário
              </label>
              <Select
                value={user?.role || "user"}
                onValueChange={(value: UserRole) => handleRoleChange(value)}
                disabled={isUpdatingRole}
              >
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário (Padrão)</SelectItem>
                  <SelectItem value="beta">Beta (Acesso Gratuito)</SelectItem>
                  <SelectItem value="lifetime">Vitalício (Permanente)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Usuários Beta e Vitalício não precisam de assinatura.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Plano</CardTitle>
            <CardDescription>
              Informações de assinatura e plano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Plano Atual
                </label>
                <Select
                  value={user?.currentPlan?.id || ""}
                  onValueChange={handlePlanChange}
                  disabled={isUpdatingPlan}
                >
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plansData?.plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                        {plan.default && " (Padrão)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Nome do Plano
                  </dt>
                  <dd className="text-sm mt-1">
                    {user?.currentPlan?.name || "Sem Plano"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Código do Plano
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.currentPlan?.codename || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Assinatura Stripe
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.stripeSubscriptionId || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Assinatura LemonSqueezy
                  </dt>
                  <dd className="text-sm font-mono mt-1">
                    {user?.lemonSqueezySubscriptionId || "N/A"}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
      {enableCredits && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Créditos e Histórico</CardTitle>
              <CardDescription>
                Saldo de créditos e histórico de transações do usuário.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="balance">Saldo Atual</TabsTrigger>
                  <TabsTrigger value="history">Histórico de Transações</TabsTrigger>
                </TabsList>

                <TabsContent value="balance" className="space-y-4">
                  {creditData?.currentCredits ? (
                    <div className="flex flex-col gap-3">
                      {Object.entries(creditData.currentCredits).map(
                        ([type, amount]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatCreditType(type)}
                              </span>
                            </div>
                            <Badge
                              variant={amount > 0 ? "default" : "secondary"}
                            >
                              {amount} créditos
                            </Badge>
                          </div>
                        )
                      )}
                      {Object.keys(creditData.currentCredits).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum crédito disponível
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Carregando créditos...
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {creditData?.transactions ? (
                    <>
                      <div className="space-y-2">
                        {creditData.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    transaction.transactionType === "credit"
                                      ? "default"
                                      : transaction.transactionType === "debit"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {transaction.transactionType === "credit"
                                    ? "+"
                                    : "-"}
                                  {transaction.amount}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {formatCreditType(transaction.creditType)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {transaction.metadata?.reason ||
                                  "Motivo não informado"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  transaction.createdAt
                                ).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            {transaction.metadata?.adminAction && (
                              <Badge variant="outline" className="text-xs">
                                Ação de Admin
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {creditData.pagination && (
                        <div className="flex items-center justify-between pt-4">
                          <p className="text-sm text-muted-foreground">
                            Página {creditData.pagination.page} de{" "}
                            {creditData.pagination.totalPages} (
                            {creditData.pagination.total} total)
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCreditPage(creditPage - 1)}
                              disabled={!creditData.pagination.hasPrev}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCreditPage(creditPage + 1)}
                              disabled={!creditData.pagination.hasNext}
                            >
                              Próximo
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        Carregando histórico de transações...
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
