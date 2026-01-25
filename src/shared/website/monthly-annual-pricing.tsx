"use client";

import { Check, User, Users } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

type Plan = {
  name: string;
  icon: typeof User;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  members: number;
  popular?: boolean;
};

const plans: Record<string, Plan> = {
  solo: {
    name: "Solo",
    icon: User,
    description: "Para você organizar suas finanças pessoais",
    monthlyPrice: 14.9,
    yearlyPrice: 139.9,
    members: 1,
  },
  duo: {
    name: "Duo",
    icon: Users,
    description: "Para casais organizarem as finanças juntos",
    monthlyPrice: 19.9,
    yearlyPrice: 189.9,
    members: 2,
    popular: true,
  },
};

const features = [
  "Orçamento inteligente",
  "Controle de parcelamentos",
  "Cartões de crédito",
  "Registro por mensagem",
  "Metas financeiras",
  "Relatórios e dashboards",
];

const formatPrice = (price: number) => {
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const MonthlyAnnualPricing = () => {
  const [isAnnually, setIsAnnually] = useState(false);

  return (
    <section className="py-32" id="pricing">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-20 max-w-(--breakpoint-md) text-center">
          <Badge variant="secondary" className="mb-4">
            30 dias grátis
          </Badge>
          <h2 className="mb-4 text-4xl tracking-tight font-bold lg:text-5xl">
            Preços Simples e Acessíveis
          </h2>
          <p className="text-muted-foreground text-lg">
            Comece grátis por 30 dias. Cancele quando quiser.
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
                    -22%
                  </Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="mt-12 grid max-w-(--breakpoint-md) gap-8 md:grid-cols-2">
            {Object.entries(plans).map(([key, plan]) => {
              const Icon = plan.icon;
              const price = isAnnually ? plan.yearlyPrice / 12 : plan.monthlyPrice;
              const totalYearly = plan.yearlyPrice;

              return (
                <div
                  key={key}
                  className={`rounded-xl border-2 p-8 transition-colors ${
                    plan.popular
                      ? "border-primary bg-primary/5"
                      : "border-gray-400 hover:border-primary"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="mb-4">Mais popular</Badge>
                  )}
                  <div className="flex h-full flex-col justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                      </div>

                      <div className="mb-2">
                        <span className="text-5xl font-bold">
                          R$ {formatPrice(price)}
                        </span>
                        <span className="ml-2 font-medium text-muted-foreground">
                          /mês
                        </span>
                      </div>

                      {isAnnually && (
                        <p className="text-sm text-muted-foreground mb-4">
                          R$ {formatPrice(totalYearly)} cobrado anualmente
                        </p>
                      )}

                      <p className="text-muted-foreground font-medium mb-6">
                        {plan.description}
                      </p>

                      <div className="rounded-lg bg-muted/50 p-3 mb-6">
                        <p className="text-sm font-medium">
                          {plan.members === 1
                            ? "Para 1 pessoa"
                            : `Para até ${plan.members} pessoas`}
                        </p>
                      </div>

                      <p className="mb-4 font-bold text-lg">Inclui</p>
                      <ul className="flex flex-col gap-3">
                        {features.map((feature) => (
                          <li key={feature} className="flex gap-3">
                            <Check className="mt-0.5 size-5 shrink-0 text-primary" />
                            <span className="font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button size="lg" className="mt-8 w-full" asChild>
                      <Link href="/sign-in">
                        Começar 30 dias grátis
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Sem compromisso. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MonthlyAnnualPricing;
