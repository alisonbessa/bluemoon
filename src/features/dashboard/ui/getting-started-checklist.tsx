"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Check,
  X,
  Wallet,
  Plus,
  MessageCircle,
  Users,
  Target,
  Compass,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useTutorial } from "@/shared/tutorial";
import confetti from "canvas-confetti";

interface ChecklistData {
  hasBudget: boolean;
  hasTransaction: boolean;
  hasGoal: boolean;
  hasMessagingConnected: boolean;
  hasPartnerInvited: boolean;
  isDuo: boolean;
}

interface ChecklistItem {
  key: string;
  label: string;
  icon: typeof Check;
  done: boolean;
  href?: string;
}

const DISMISSED_KEY = "hivebudget_checklist_dismissed";
const CELEBRATED_KEY = "hivebudget_checklist_celebrated";

export function GettingStartedChecklist() {
  const { data, isLoading } = useSWR<ChecklistData>(
    "/api/app/onboarding/checklist"
  );
  const { startTutorial } = useTutorial();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "true";
  });

  const items: ChecklistItem[] = data
    ? [
        {
          key: "budget",
          label: "Criar orçamento",
          icon: Wallet,
          done: data.hasBudget,
        },
        {
          key: "transaction",
          label: "Registrar primeiro gasto",
          icon: Plus,
          done: data.hasTransaction,
        },
        {
          key: "goal",
          label: "Criar uma meta financeira",
          icon: Target,
          done: data.hasGoal,
          href: "/app/goals",
        },
        {
          key: "messaging",
          label: "Conectar WhatsApp ou Telegram",
          icon: MessageCircle,
          done: data.hasMessagingConnected,
          href: "/app/settings",
        },
        ...(data.isDuo
          ? [
              {
                key: "partner",
                label: "Convidar parceiro(a)",
                icon: Users,
                done: data.hasPartnerInvited,
                href: "/app/settings",
              } as ChecklistItem,
            ]
          : []),
      ]
    : [];

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  // Fire confetti when all items are completed
  const fireCelebration = useCallback(() => {
    const hasCelebrated = localStorage.getItem(CELEBRATED_KEY) === "true";
    if (hasCelebrated) return;

    localStorage.setItem(CELEBRATED_KEY, "true");
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.4 + 0.3, y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  useEffect(() => {
    if (allDone && !dismissed) {
      fireCelebration();
    }
  }, [allDone, dismissed, fireCelebration]);

  if (dismissed || isLoading || !data) return null;

  // Auto-hide when all done (after celebration)
  if (allDone) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Tudo pronto! Primeiros passos completos.
                </p>
                <p className="text-xs text-muted-foreground">
                  Agora é só manter o controle em dia.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {
                localStorage.setItem(DISMISSED_KEY, "true");
                setDismissed(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleStartTour = () => {
    startTutorial("initial-setup");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Primeiros Passos ({completedCount} de {totalCount})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                item.done
                  ? "text-muted-foreground"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full shrink-0",
                  item.done
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "border-2 border-muted-foreground/30"
                )}
              >
                {item.done ? (
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <Icon className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className={cn(item.done && "line-through")}>
                {item.label}
              </span>
            </div>
          );

          if (item.href && !item.done) {
            return (
              <Link key={item.key} href={item.href}>
                {content}
              </Link>
            );
          }

          return <div key={item.key}>{content}</div>;
        })}

        {/* Tour button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleStartTour}
          >
            <Compass className="h-4 w-4" />
            Fazer tour guiado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
