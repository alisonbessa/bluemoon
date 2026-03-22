"use client";

import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Users } from "lucide-react";
import { appConfig } from "@/shared/lib/config";

export function CTA2() {
  return (
    <aside className="border-y border-border/40" aria-label="Call to Action">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O próximo mês pode ser diferente
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Famílias brasileiras já estão planejando seu dinheiro com o HiveBudget.
            Comece hoje e veja a diferença no primeiro mês.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span>{appConfig.waitlistMode ? "Gratuito durante o beta" : "30 dias grátis para testar"}</span>
            </div>
          </div>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
                {appConfig.waitlistMode ? "Começar Grátis" : "Começar Grátis"}
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
