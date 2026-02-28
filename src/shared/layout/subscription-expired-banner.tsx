"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function SubscriptionExpiredBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2.5 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
            <span className="font-medium">Sua assinatura expirou.</span>{" "}
            <span className="hidden sm:inline">
              Seus dados estão seguros. Reative para voltar a registrar transações.
            </span>
            <span className="sm:hidden">
              Reative para continuar.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="default" className="h-7 text-xs">
            <Link href="/app/choose-plan">
              <Sparkles className="mr-1 h-3 w-3" />
              Reativar plano
            </Link>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-0.5"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
