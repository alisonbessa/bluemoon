"use client";

import React from "react";
import { HeartCrack, AlertTriangle, MessageSquareWarning } from "lucide-react";

const painPoints = [
  {
    icon: AlertTriangle,
    text: "Falta de clareza sobre os gastos do mês",
  },
  {
    icon: MessageSquareWarning,
    text: "Discussões por gastos não combinados",
  },
  {
    icon: HeartCrack,
    text: "Sensação de descontrole financeiro no casal",
  },
];

export function PainPoints() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">
            Dinheiro é uma das maiores causas de estresse em um relacionamento
          </h2>

          <div className="mt-10 flex flex-col gap-4 text-left max-w-md mx-auto">
            {painPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <div key={index} className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
                  <Icon className="h-5 w-5 shrink-0 text-red-500" />
                  <span className="text-foreground">{point.text}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/20 p-8">
            <p className="text-lg text-muted-foreground">
              O problema não é falta de dinheiro.
            </p>
            <p className="mt-2 text-xl font-bold text-foreground">
              É falta de organização juntos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
