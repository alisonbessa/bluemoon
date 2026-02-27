"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { EyeIcon, EyeOffIcon, ShieldIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PrivacyMode } from "@/db/schema/budgets";
import { PRIVACY_OPTIONS, PRIVACY_MAP } from "@/shared/lib/privacy";

const PRIVACY_ICONS: Record<PrivacyMode, React.ReactNode> = {
  visible: <EyeIcon className="h-4 w-4" />,
  totals_only: <ShieldIcon className="h-4 w-4" />,
  private: <EyeOffIcon className="h-4 w-4" />,
};

interface PrivacySettingsProps {
  budgetId: string;
}

export function PrivacySettings({ budgetId }: PrivacySettingsProps) {
  const [currentMode, setCurrentMode] = useState<PrivacyMode>("visible");
  const [pendingMode, setPendingMode] = useState<PrivacyMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const response = await fetch(`/api/app/budget?budgetId=${budgetId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentMode(data.budget.privacyMode || "visible");
          setPendingMode(data.budget.pendingPrivacyMode || null);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchBudget();
  }, [budgetId]);

  const handleRequestChange = async (mode: PrivacyMode) => {
    if (mode === currentMode) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/app/budget/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId, privacyMode: mode }),
      });

      if (!response.ok) {
        throw new Error("Erro ao solicitar mudança");
      }

      const data = await response.json();

      if (data.applied) {
        setCurrentMode(mode);
        setPendingMode(null);
        toast.success("Privacidade atualizada!");
      } else {
        setPendingMode(mode);
        toast.success("Solicitacao enviada ao parceiro por email!");
      }
    } catch {
      toast.error("Erro ao solicitar mudança de privacidade");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldIcon className="h-5 w-5 text-muted-foreground" />
            Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldIcon className="h-5 w-5 text-muted-foreground" />
          Privacidade dos gastos pessoais
        </CardTitle>
        <CardDescription>
          Controle a visibilidade dos gastos pessoais entre os membros do orçamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingMode && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 shrink-0">
              Pendente
            </Badge>
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Mudança para &ldquo;{PRIVACY_MAP[pendingMode]?.label}&rdquo; aguardando confirmação do parceiro
            </span>
          </div>
        )}

        {PRIVACY_OPTIONS.map((option) => {
          const isActive = currentMode === option.value;
          const isPending = pendingMode === option.value;

          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              className={`w-full justify-start h-auto py-3 px-4 ${
                isActive ? "" : "hover:bg-muted/50"
              }`}
              onClick={() => handleRequestChange(option.value)}
              disabled={isActive || isSaving}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5 shrink-0">{PRIVACY_ICONS[option.value]}</div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Atual</Badge>
                    )}
                    {isPending && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">Pendente</Badge>
                    )}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </div>
            </Button>
          );
        })}

        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando solicitação...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
