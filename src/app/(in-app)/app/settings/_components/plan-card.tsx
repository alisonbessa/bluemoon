"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
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
  Loader2,
  CreditCard,
  Crown,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { MeResponse } from "@/app/api/app/me/types";

interface PlanCardProps {
  user: MeResponse["user"] | undefined;
  currentPlan: MeResponse["currentPlan"];
  hasBudget: boolean;
  mutateUser: () => void;
}

export function PlanCard({ user, currentPlan, hasBudget, mutateUser }: PlanCardProps) {
  const [showCancelTrialConfirm, setShowCancelTrialConfirm] = useState(false);
  const [showChangePlanConfirm, setShowChangePlanConfirm] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isCancellingTrial, setIsCancellingTrial] = useState(false);

  const isLifetime = user?.role === "lifetime";
  const isBeta = user?.role === "beta";
  const isSpecialAccess = isLifetime || isBeta;
  const hasTrialEnding = user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();
  const trialDaysRemaining = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

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

  return (
    <>
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
                    <Sparkles className="h-4 w-4" />
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
                      <ArrowUpDown className="h-4 w-4" />
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
            // Free/default plan - distinguish returning users from new ones
            <div className="rounded-lg border bg-muted/50 p-4">
              {hasBudget ? (
                // Returning user - cancelled subscription
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold">Plano Expirado</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Inativo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sua assinatura foi cancelada. Você está no modo somente leitura.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Seus dados estão seguros. Reative para voltar a registrar transações.
                  </p>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/app/choose-plan">
                      <Sparkles className="h-4 w-4" />
                      Reativar plano
                    </Link>
                  </Button>
                </>
              ) : (
                // New user without subscription
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{currentPlan?.name || "Plano Gratuito"}</span>
                    <Badge variant="secondary">Gratuito</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Funcionalidades basicas para controle financeiro pessoal
                  </p>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/app/choose-plan">
                      <Sparkles className="h-4 w-4" />
                      Fazer upgrade
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  <Loader2 className="h-4 w-4 animate-spin" />
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                `Mudar para ${currentPlan?.codename === "solo" ? "Duo" : "Solo"}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
