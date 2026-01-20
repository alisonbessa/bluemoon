"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

const MonthlyAnnualPricing = () => {
  const [isAnnually, setIsAnnually] = useState(false);
  return (
    <section className="py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-20 max-w-(--breakpoint-md) text-center">
          <p className="text-primary font-medium mb-4">Oferta Especial de Lançamento</p>
          <h2 className="mb-4 text-4xl tracking-tight font-bold lg:text-5xl">
            Preços Simples e Transparentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Escolha o plano perfeito para suas necessidades. Sem taxas ocultas.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-base font-medium">Ciclo de cobrança</span>
          <div className="flex h-12 items-center rounded-md bg-muted p-1 text-lg">
            <RadioGroup
              defaultValue="monthly"
              className="h-full grid-cols-2"
              onValueChange={(value) => {
                setIsAnnually(value === "annually");
              }}
            >
              <div className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-white'>
                <RadioGroupItem
                  value="monthly"
                  id="monthly"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="monthly"
                  className="flex h-full cursor-pointer items-center justify-center px-7 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary"
                >
                  Mensal
                </Label>
              </div>
              <div className='h-full rounded-md transition-all has-[button[data-state="checked"]]:bg-white'>
                <RadioGroupItem
                  value="annually"
                  id="annually"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="annually"
                  className="flex h-full cursor-pointer items-center justify-center gap-1 px-7 font-semibold text-muted-foreground peer-data-[state=checked]:text-primary"
                >
                  Anual
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-100 px-1.5 text-green-600"
                  >
                    -20%
                  </Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="mt-12 grid max-w-(--breakpoint-md) gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-2 border-gray-400 p-8 hover:border-primary transition-colors">
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <h3 className="mb-4 text-2xl font-bold">Plano Básico</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold">
                      {isAnnually ? "R$ 63" : "R$ 79"}
                    </span>
                    <span className="ml-2 font-medium text-muted-foreground">
                      por mês
                    </span>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Ideal para pequenas equipes ou negócios que estão começando.
                  </p>
                  <p className="mb-4 mt-8 font-bold text-lg">Inclui</p>
                  <ul className="flex flex-col gap-4">
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Limite de 5 projetos</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">5GB de armazenamento</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Até 3 usuários</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Suporte apenas por email</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">
                        Sem rastreamento de tempo
                      </span>
                    </li>
                  </ul>
                </div>
                <Button size="lg" className="mt-8">
                  Iniciar teste grátis
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-400 border-2 p-8 hover:border-primary transition-colors">
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <h3 className="mb-4 text-2xl font-bold">Plano Pro</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold">
                      {isAnnually ? "R$ 239" : "R$ 299"}
                    </span>
                    <span className="ml-2 font-medium text-muted-foreground">
                      por mês
                    </span>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Ideal para negócios de médio a grande porte. Tenha todos os recursos
                    que você precisa.
                  </p>
                  <p className="mb-4 mt-8 font-bold text-lg">
                    Tudo do Básico, mais
                  </p>
                  <ul className="flex flex-col gap-4">
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Projetos ilimitados</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">50GB de armazenamento</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Usuários ilimitados</span>
                    </li>
                    <li className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-primary" />
                      <span className="font-medium">Suporte prioritário</span>
                    </li>
                  </ul>
                </div>
                <Button size="lg" className="mt-8">
                  Iniciar teste grátis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MonthlyAnnualPricing;
