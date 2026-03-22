import { Wallet } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

const CTA1 = () => {
  return (
    <section className="py-32" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[620px] items-center justify-center rounded-3xl bg-gradient-to-br from-primary/90 to-primary/70">
          <div className="flex flex-col gap-8 p-4 text-center text-primary-foreground">
            <div className="flex items-center justify-center gap-2 text-2xl font-medium">
              <Wallet className="h-full w-7" /> Controle Total
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold max-w-2xl mx-auto">
              Chega de surpresa no fim do mês
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
              Cada real ganha uma função antes de sair da sua conta.
              É o orçamento base zero: você decide para onde o dinheiro vai, não descobre depois.
            </p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                size="lg"
                className="bg-background text-primary hover:bg-background/90"
                asChild
              >
                <Link href={appConfig.waitlistMode ? "/join-waitlist" : "#pricing"}>
                  {appConfig.waitlistMode ? "Entrar na Lista de Espera" : "Testar 30 dias grátis"}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-0 bg-background/20 backdrop-blur-xs hover:bg-background/30 hover:text-primary-foreground"
                asChild
              >
                <Link href="#how-it-works">Como Funciona</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA1;
