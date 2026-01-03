"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PartyPopper, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { formatCurrency } from "@/lib/formatters";

interface SetupSummary {
  accountsCount: number;
  incomeSourcesCount: number;
  categoriesCount: number;
  goalsCount: number;
  totalMonthlyIncome: number;
}

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: SetupSummary;
}

export function CelebrationModal({ isOpen, onClose, summary }: CelebrationModalProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isOpen && !hasAnimated) {
      setHasAnimated(true);

      // Fire confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Fire from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, hasAnimated]);

  if (!isOpen) return null;

  const summaryItems = summary ? [
    { icon: "💳", label: "Contas", value: summary.accountsCount, suffix: "cadastradas" },
    { icon: "💰", label: "Fontes de renda", value: summary.incomeSourcesCount, suffix: `(${formatCurrency(summary.totalMonthlyIncome)}/mês)` },
    { icon: "📁", label: "Categorias", value: summary.categoriesCount, suffix: "criadas" },
    { icon: "🎯", label: "Metas", value: summary.goalsCount, suffix: "definidas" },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header with celebration gradient */}
        <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 p-8 text-center">
          <div className="flex justify-center gap-2 mb-4">
            <PartyPopper className="h-8 w-8 text-primary animate-bounce" />
            <Sparkles className="h-8 w-8 text-accent animate-pulse" />
            <PartyPopper className="h-8 w-8 text-secondary animate-bounce" style={{ animationDelay: "0.1s" }} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Parabéns! 🎉
          </h1>
          <p className="text-muted-foreground">
            Sua plataforma está pronta para uso!
          </p>
        </div>

        {/* Summary */}
        {summaryItems.length > 0 && (
          <div className="p-6 border-t border-border">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Resumo da sua configuração
            </h2>

            <div className="space-y-3">
              {summaryItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium">{item.value}</span>
                    <span className="text-muted-foreground ml-1">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.suffix}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Dica:</span> Você pode ajustar
              qualquer configuração a qualquer momento nas configurações da plataforma.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex justify-center">
          <Button onClick={onClose} size="lg" className="gap-2 px-8">
            Começar a usar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
