"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Heart, Lock, Target, Eye } from "lucide-react";

const coupleFeatures = [
  {
    icon: Heart,
    title: "Orçamento compartilhado",
    description: "Gastos da casa visíveis para os dois, decisões tomadas em conjunto",
  },
  {
    icon: Lock,
    title: "Privacidade individual",
    description: "Cada um tem seu espaço para gastos pessoais sem precisar dar satisfação",
  },
  {
    icon: Target,
    title: "Objetivos em comum",
    description: "Viagem, casa nova, reserva de emergência — planejem juntos",
  },
  {
    icon: Eye,
    title: "Transparência total",
    description: "Sem surpresas no fim do mês, cada um sabe quanto já foi gasto",
  },
];

export function ForCouples() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Image */}
            <div className="flex items-center justify-center order-2 lg:order-1">
              <div className="rounded-xl border bg-card overflow-hidden">
                <Image
                  src="/images/couple_on_sofa.png"
                  alt="Casal sentado no sofá gerenciando finanças juntos"
                  width={500}
                  height={500}
                  className="h-auto w-full"
                />
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold md:text-4xl mb-4">
                Perfeito para quem divide a vida
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Gerencie dinheiro junto sem perder a privacidade. Cada um com seu
                espaço, decisões grandes tomadas em conjunto.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                {coupleFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/sign-up?plan=duo&billing=monthly">Começar com meu parceiro(a)</Link>
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">
                  Apenas quem cria a conta paga. O parceiro(a) entra grátis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
