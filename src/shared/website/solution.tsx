"use client";

import React from "react";
import { CalendarCheck, Eye, ShieldCheck } from "lucide-react";

const solutions = [
  {
    icon: CalendarCheck,
    title: "Planejem juntos",
    description: "Decidam para onde cada real vai antes de gastar",
  },
  {
    icon: Eye,
    title: "Saibam exatamente quanto podem gastar",
    description: "Sem achismo, com números reais e atualizados",
  },
  {
    icon: ShieldCheck,
    title: "Evitem surpresas no fim do mês",
    description: "Cada gasto é registrado e comparado com o planejado",
  },
];

export function Solution() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Com o HiveBudget vocês:
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {solutions.map((solution, index) => {
              const Icon = solution.icon;
              return (
                <div
                  key={index}
                  className="rounded-xl border bg-card p-6 text-center shadow-sm"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-bold">{solution.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {solution.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
