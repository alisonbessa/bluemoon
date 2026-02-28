"use client";

import React from "react";
import { Card, CardContent } from "@/shared/ui/card";

const problems = [
  {
    emoji: "😰",
    text: "Fim do mês chega e o dinheiro simplesmente sumiu",
  },
  {
    emoji: "📊",
    text: "Planilha abandonada na segunda semana (de novo)",
  },
  {
    emoji: "💸",
    text: "Apps que só mostram o estrago depois que já aconteceu",
  },
  {
    emoji: "🤷",
    text: "Briga com parceiro(a) por causa de gastos não combinados",
  },
];

const solutions = [
  {
    emoji: "✅",
    text: "Cada real tem um destino definido ANTES de você gastar",
  },
  {
    emoji: "✅",
    text: "Registra em 5 segundos por mensagem — sem abrir app",
  },
  {
    emoji: "✅",
    text: "Dashboards que mostram a verdade sobre seu dinheiro",
  },
  {
    emoji: "✅",
    text: "Orçamento compartilhado com parceiro(a) sem perder privacidade",
  },
];

export function PainPoints() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            Se identificou com algum desses?
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold text-red-700 dark:text-red-400">
                  Sem controle financeiro...
                </h3>
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
