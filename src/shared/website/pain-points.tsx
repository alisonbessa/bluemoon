"use client";

import React from "react";
import { Card, CardContent } from "@/shared/ui/card";

const problems = [
  {
    emoji: "😰",
    text: "Chega no fim do mês sem saber onde foi o dinheiro",
  },
  {
    emoji: "📊",
    text: "Já tentou planilha mas abandonou depois de 2 semanas",
  },
  {
    emoji: "💸",
    text: "Apps que só mostram o que você JÁ gastou, não ajudam a planejar",
  },
  {
    emoji: "🤷",
    text: "Difícil organizar gastos quando divide conta com alguém",
  },
];

const solutions = [
  {
    emoji: "✅",
    text: "Define para onde cada real vai ANTES de gastar",
  },
  {
    emoji: "✅",
    text: "Acompanha tudo pelo celular ou por mensagem, sem complicação",
  },
  {
    emoji: "✅",
    text: "Vê dashboards visuais que fazem sentido de verdade",
  },
  {
    emoji: "✅",
    text: "Divide orçamentos com parceiro(a) ou família facilmente",
  },
];

export function PainPoints() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            Você conhece essa situação?
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {problems.map((problem, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-xl">{problem.emoji}</span>
                      <span className="text-muted-foreground">{problem.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold text-green-700 dark:text-green-400">
                  Com o HiveBudget você...
                </h3>
                <ul className="space-y-4">
                  {solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-xl">{solution.emoji}</span>
                      <span className="text-foreground">{solution.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
