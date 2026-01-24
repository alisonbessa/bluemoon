"use client";

import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Users } from "lucide-react";

export function CTA2() {
  return (
    <aside className="border-y border-border/40" aria-label="Call to Action">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pronto para assumir o controle?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Junte-se a centenas de famílias brasileiras que já estão organizando
            suas finanças com o HiveBudget.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span>Famílias usando HiveBudget</span>
            </div>
          </div>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/sign-in">Começar Grátis</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </div>
    </aside>
  );
}
