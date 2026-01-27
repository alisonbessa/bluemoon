import { Wallet } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

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
              Saiba exatamente para onde vai cada centavo do seu dinheiro
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
              Com o método de orçamento baseado em zero, você dá uma função para cada real
              antes de gastar. Nunca mais termine o mês sem saber para onde foi o dinheiro.
            </p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                size="lg"
                className="bg-background text-primary hover:bg-background/90"
                asChild
              >
                <Link href="#pricing">Começar Agora</Link>
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
