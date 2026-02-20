"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormModalWrapper } from "@/shared/molecules";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
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
  User,
  Palette,
  Download,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Loader2,
  CreditCard,
  Crown,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Users,
  HelpCircle,
  MessageSquare,
  Bug,
} from "lucide-react";
import { MessagingConnectionCard } from "@/integrations/messaging/MessagingConnectionCard";
import { MembersManagement } from "@/shared/settings/members-management";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { PageContent, PageHeader } from "@/shared/molecules";

export default function SettingsPage() {
  const { user, currentPlan, isLoading: isUserLoading, mutate: mutateUser } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [showOnboardingConfirm, setShowOnboardingConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelTrialConfirm, setShowCancelTrialConfirm] = useState(false);
  const [showChangePlanConfirm, setShowChangePlanConfirm] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancellingTrial, setIsCancellingTrial] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"question" | "bug" | "feedback">("question");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const { startTutorial } = useTutorial();
  const router = useRouter();

  // Computed properties for plan/trial status
  const isLifetime = user?.role === "lifetime";
  const isBeta = user?.role === "beta";
  const isSpecialAccess = isLifetime || isBeta;
  const hasTrialEnding = user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();
  const trialDaysRemaining = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Load user's display name
  useEffect(() => {
    if (user) {
      // Use displayName if set, otherwise use first name from Google
      const firstName = user.name?.split(" ")[0] || "";
      setDisplayName(user.displayName || firstName);
    }
  }, [user]);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch("/api/app/budgets");
        if (response.ok) {
          const data = await response.json();
          if (data.budgets?.length > 0) {
            setBudgetId(data.budgets[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching budgets:", error);
      }
    };
    fetchBudgets();
  }, []);

  const handleRestartOnboarding = () => {
    setShowOnboardingConfirm(false);
    startTutorial("initial-setup");
    toast.info("Tutorial iniciado! Siga os passos para revisar sua configuração.");
    router.push("/app/accounts");
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Digite um nome");
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/app/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (response.ok) {
        mutateUser();
        toast.success("Perfil atualizado!");
      } else {
        toast.error("Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/app/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hivebudget-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Dados exportados com sucesso!");
      } else {
        toast.error("Erro ao exportar dados");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/app/me", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Conta excluída. Até logo!");
        await signOut({ callbackUrl: "/" });
      } else {
        toast.error("Erro ao excluir conta");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleCancelTrial = async () => {
    setIsCancellingTrial(true);
    try {
      const response = await fetch("/api/app/trial/cancel", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Assinatura cancelada. Você não será cobrado.");
        mutateUser();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao cancelar assinatura");
      }
    } catch (error) {
      console.error("Error cancelling trial:", error);
      toast.error("Erro ao cancelar assinatura");
    } finally {
      setIsCancellingTrial(false);
      setShowCancelTrialConfirm(false);
    }
  };

  const handleChangePlan = async () => {
    const newPlanCodename = currentPlan?.codename === "solo" ? "duo" : "solo";
    setIsChangingPlan(true);
    try {
      const response = await fetch("/api/app/subscription/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlanCodename }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Plano alterado com sucesso!");
        mutateUser();
      } else {
        toast.error(data.error || "Erro ao alterar plano");
      }
    } catch (error) {
      console.error("Error changing plan:", error);
      toast.error("Erro ao alterar plano");
    } finally {
      setIsChangingPlan(false);
      setShowChangePlanConfirm(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setIsSendingFeedback(true);
    try {
      const typeLabels = {
        question: "Dúvida",
        bug: "Bug",
        feedback: "Sugestão",
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.displayName || user?.name || "Usuário",
          email: user?.email || "sem-email@hivebudget.com",
          message: `[${typeLabels[feedbackType]}] ${feedbackMessage}`,
        }),
      });

      if (response.ok) {
        toast.success("Mensagem enviada! Responderemos em breve.");
        setFeedbackMessage("");
        setShowFeedbackModal(false);
      } else {
        toast.error("Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const openFeedbackModal = (type: "question" | "bug" | "feedback") => {
    setFeedbackType(type);
    setFeedbackMessage("");
    setShowFeedbackModal(true);
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title="Configurações"
        description="Gerencie suas preferências e configurações da conta"
      />

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2 min-w-0">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Perfil</CardTitle>
              </div>
              <CardDescription>
                Suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isUserLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 shrink-0">
                      <AvatarImage src={user?.image || undefined} alt={user?.name || "Usuário"} />
                      <AvatarFallback className="text-2xl font-bold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Apelido</Label>
                    <Input
                      id="displayName"
                      placeholder="Como você quer ser chamado?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nome será usado no app ao invés do seu nome completo
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar alterações"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Aparência</CardTitle>
              </div>
              <CardDescription>
                Personalize a interface do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Claro</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Escuro</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sistema</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Management - Only show for Duo plans (maxBudgetMembers >= 2) */}
          {budgetId && (currentPlan?.quotas?.maxBudgetMembers ?? 1) >= 2 && (
            <MembersManagement budgetId={budgetId} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-w-0">
          {/* Messaging Integration */}
          <MessagingConnectionCard />

          {/* Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Seu plano</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpecialAccess ? (
                // Lifetime/Beta users
                <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isLifetime ? (
                        <Crown className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      )}
                      <span className="font-semibold">
                        {currentPlan?.name || (isLifetime ? "Acesso Vitalício" : "Acesso Beta")}
                      </span>
                    </div>
                    <Badge variant={isLifetime ? "default" : "secondary"} className="bg-amber-600">
                      {isLifetime ? "Lifetime" : "Beta"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isLifetime
                      ? "Acesso completo permanente, sem cobranças futuras."
                      : "Acesso antecipado a todas as funcionalidades."}
                  </p>
                </div>
              ) : hasTrialEnding ? (
                // Users in trial
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{currentPlan?.name || "Plano"}</span>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      Trial
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {trialDaysRemaining > 0
                      ? `Seu trial termina em ${trialDaysRemaining} dia${trialDaysRemaining > 1 ? "s" : ""}.`
                      : "Seu trial termina hoje."}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Após o trial, você será cobrado automaticamente. Cancele a qualquer momento.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => setShowCancelTrialConfirm(true)}
                    >
                      Cancelar assinatura
                    </Button>
                  </div>
                </div>
              ) : currentPlan && !currentPlan.default ? (
                // Active paid subscription
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {currentPlan.codename === "duo" ? (
                        <Users className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-semibold">{currentPlan.name}</span>
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  {currentPlan.codename === "solo" ? (
                    // Solo user - encourage upgrade
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sua assinatura está ativa.
                      </p>
                      <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Gerencie a dois!</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Compartilhe o controle financeiro com seu parceiro(a). Cada um com sua visão, tudo sincronizado.
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowChangePlanConfirm(true)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Fazer upgrade para Duo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => setShowCancelTrialConfirm(true)}
                      >
                        Cancelar assinatura
                      </Button>
                    </div>
                  ) : (
                    // Duo user - standard view
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sua assinatura está ativa.
                      </p>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowChangePlanConfirm(true)}
                        >
                          <ArrowUpDown className="mr-2 h-4 w-4" />
                          Mudar para Solo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={() => setShowCancelTrialConfirm(true)}
                        >
                          Cancelar assinatura
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // Free/default plan
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{currentPlan?.name || "Plano Gratuito"}</span>
                    <Badge variant="secondary">Gratuito</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Funcionalidades básicas para controle financeiro pessoal
                  </p>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/app/choose-plan">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Fazer upgrade
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openFeedbackModal("question")}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Tirar dúvidas
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openFeedbackModal("feedback")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Enviar sugestão
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openFeedbackModal("bug")}
              >
                <Bug className="mr-2 h-4 w-4" />
                Reportar bug
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowOnboardingConfirm(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refazer configuração inicial
              </Button>
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar transações (CSV)
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir minha conta
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Onboarding Confirmation Dialog */}
      <AlertDialog open={showOnboardingConfirm} onOpenChange={setShowOnboardingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refazer configuração inicial?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso permitirá que você reconfigure suas categorias, contas e fontes de renda.
              Os dados existentes serão mantidos, mas novas categorias podem ser adicionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartOnboarding}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os seus dados, incluindo transações,
              contas, categorias e orçamentos serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir minha conta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Trial/Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelTrialConfirm} onOpenChange={setShowCancelTrialConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasTrialEnding
                ? "Ao cancelar durante o trial, você não será cobrado. Seu acesso continua até o fim do período de teste."
                : "Ao cancelar, você manterá acesso até o fim do período pago atual. Após isso, sua conta voltará ao plano gratuito."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingTrial}>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTrial}
              disabled={isCancellingTrial}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancellingTrial ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Cancelar assinatura"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Confirmation Dialog */}
      <AlertDialog open={showChangePlanConfirm} onOpenChange={setShowChangePlanConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mudar para o plano {currentPlan?.codename === "solo" ? "Duo" : "Solo"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentPlan?.codename === "solo" ? (
                <>
                  O plano <strong>Duo</strong> permite convidar seu parceiro(a) para compartilhar o orçamento.
                  O valor será ajustado proporcionalmente na sua próxima fatura.
                </>
              ) : (
                <>
                  O plano <strong>Solo</strong> é individual.
                  {" "}
                  <span className="text-amber-600 dark:text-amber-400">
                    Se você tem um parceiro conectado, remova-o antes de fazer o downgrade.
                  </span>
                  {" "}
                  O valor será ajustado proporcionalmente na sua próxima fatura.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingPlan}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangePlan}
              disabled={isChangingPlan}
            >
              {isChangingPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                `Mudar para ${currentPlan?.codename === "solo" ? "Duo" : "Solo"}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Modal */}
      <FormModalWrapper
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        title={
          feedbackType === "question" ? "Tirar dúvidas"
          : feedbackType === "bug" ? "Reportar bug"
          : "Enviar sugestão"
        }
        description={
          feedbackType === "question" ? "Descreva sua dúvida e responderemos por email."
          : feedbackType === "bug" ? "Descreva o problema encontrado com o máximo de detalhes."
          : "Compartilhe suas ideias para melhorar o app."
        }
        isSubmitting={isSendingFeedback}
        onSubmit={handleSendFeedback}
        submitLabel="Enviar"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              placeholder={
                feedbackType === "question"
                  ? "Qual é a sua dúvida?"
                  : feedbackType === "bug"
                  ? "O que aconteceu? Descreva os passos para reproduzir..."
                  : "O que você gostaria de ver no app?"
              }
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Responderemos para {user?.email}
          </p>
        </div>
      </FormModalWrapper>
    </PageContent>
  );
}
