"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Eye, Users, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { PrivacyMode } from "@/db/schema/budgets";

interface StepPrivacyProps {
  selectedMode: PrivacyMode;
  onSelectMode: (mode: PrivacyMode) => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

const PRIVACY_OPTIONS: {
  value: PrivacyMode;
  label: string;
  description: string;
  icon: typeof Eye;
  badge?: string;
}[] = [
  {
    value: "visible",
    label: "Tudo visível",
    description:
      "Ambos veem todas as transações, contas e metas. Transparência total.",
    icon: Eye,
    badge: "Mais popular",
  },
  {
    value: "unified",
    label: "Unificado",
    description:
      "Vocês compartilham o orçamento como uma conta conjunta. Cada um vê os totais do outro, mas as transações pessoais ficam ocultas.",
    icon: Users,
  },
  {
    value: "private",
    label: "Privado",
    description:
      "Cada um tem total privacidade. Só o que é compartilhado aparece para os dois.",
    icon: Lock,
  },
];

export function StepPrivacy({
  selectedMode,
  onSelectMode,
  onNext,
  isSubmitting,
}: StepPrivacyProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          Como vocês querem dividir a visibilidade?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Isso define o que cada um pode ver do outro. Vocês podem mudar depois
          (requer aceite de ambos).
        </p>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {PRIVACY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMode === option.value;

          return (
            <Card
              key={option.value}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => onSelectMode(option.value)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base">{option.label}</h3>
                      {option.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button size="lg" className="w-full" onClick={onNext} disabled={isSubmitting}>
        {isSubmitting ? "Criando..." : "Começar"}
        {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
