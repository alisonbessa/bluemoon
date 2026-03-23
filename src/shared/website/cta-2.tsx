"use client";

import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { appConfig } from "@/shared/lib/config";

export function CTA2() {
  return (
    <aside className="border-y border-border/40" aria-label="Call to Action">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm">
              <Heart className="h-4 w-4 text-primary" />
              <span>{appConfig.waitlistMode ? "Gratuito durante o beta" : "30 dias grátis para testar"}</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O próximo mês pode ser diferente
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Casais brasileiros já estão organizando suas finanças com o HiveBudget.
            Comece hoje e sinta a diferença no primeiro mês juntos.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
                Começar Grátis em Casal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {appConfig.waitlistMode
              ? "Sem cartão de crédito. Gratuito durante o beta."
              : "30 dias grátis. Cancele quando quiser."}
          </p>
        </div>
      </div>
    </aside>
  );
}
