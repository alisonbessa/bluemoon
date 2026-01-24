"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Wallet, PieChart, CheckCircle, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const steps = [
  {
    step: 1,
    title: "Você recebe",
    icon: Wallet,
    highlight: "R$ 5.000",
    subtitle: "Salário de Março",
    detail: "Depositado em 05/03",
    caption: "Seu salário caiu na conta",
  },
  {
    step: 2,
    title: "Você distribui",
    icon: PieChart,
    categories: [
      { icon: "🏠", name: "Moradia", value: 2000 },
      { icon: "🍔", name: "Alimentação", value: 800 },
      { icon: "🚗", name: "Transporte", value: 400 },
      { icon: "🎉", name: "Lazer", value: 300 },
      { icon: "💰", name: "Reserva", value: 500 },
    ],
    total: 4000,
    remaining: 1000,
    caption: "Cada real tem um destino antes de gastar",
  },
  {
    step: 3,
    title: "Você acompanha",
    icon: CheckCircle,
    results: [
      { icon: "🏠", name: "Moradia", spent: 2000, budget: 2000, status: "ok" as const },
      { icon: "🍔", name: "Alimentação", spent: 650, budget: 800, status: "under" as const },
      { icon: "🚗", name: "Transporte", spent: 420, budget: 400, status: "over" as const },
      { icon: "🎉", name: "Lazer", spent: 280, budget: 300, status: "under" as const },
    ],
    caption: "Sem surpresas. Você sabe onde foi cada real.",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function Step1Card() {
  const step = steps[0];
  const Icon = step.icon;

  return (
    <Card className="relative h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20" />
      <CardContent className="relative flex h-full flex-col p-6">
        {/* Step Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            {step.step}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{step.title}</span>
        </div>

        {/* Content - centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          <p className="my-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {step.highlight}
          </p>
          <p className="text-xs text-muted-foreground">{step.detail}</p>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-sm text-muted-foreground">{step.caption}</p>
      </CardContent>
    </Card>
  );
}

function Step2Card() {
  const step = steps[1];
  const Icon = step.icon;

  if (!("categories" in step)) return null;

  return (
    <Card className="relative h-full overflow-hidden">
      <CardContent className="flex h-full flex-col p-6">
        {/* Step Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {step.step}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{step.title}</span>
        </div>

        {/* Content - centered vertically */}
        <div className="flex flex-1 flex-col justify-center">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-medium">Seu Orçamento</span>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            {step.categories?.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(category.value)}</span>
              </div>
            ))}
          </div>

          {/* Divider & Total */}
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total alocado:</span>
              <span className="font-medium">{formatCurrency(step.total ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sobra:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(step.remaining ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-sm text-muted-foreground">{step.caption}</p>
      </CardContent>
    </Card>
  );
}

function Step3Card() {
  const step = steps[2];
  const Icon = step.icon;

  if (!("results" in step)) return null;

  const getStatusColor = (status: "ok" | "under" | "over") => {
    switch (status) {
      case "ok":
        return "bg-emerald-500";
      case "under":
        return "bg-emerald-500";
      case "over":
        return "bg-red-500";
    }
  };

  const getStatusIcon = (status: "ok" | "under" | "over") => {
    switch (status) {
      case "ok":
        return "✅";
      case "under":
        return "👍";
      case "over":
        return "⚠️";
    }
  };

  return (
    <Card className="relative h-full overflow-hidden">
      <CardContent className="flex h-full flex-col p-6">
        {/* Step Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
            {step.step}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{step.title}</span>
        </div>

        {/* Content - centered vertically */}
        <div className="flex flex-1 flex-col justify-center">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
              <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-medium">Final do Mês</span>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            {step.results?.map((result) => {
              const percentage = Math.round((result.spent / result.budget) * 100);
              const barWidth = Math.min(percentage, 100);

              return (
                <div key={result.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <span>{result.icon}</span>
                      <span>{result.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">
                        {formatCurrency(result.spent)} / {formatCurrency(result.budget)}
                      </span>
                      <span>{getStatusIcon(result.status)}</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={cn("h-full rounded-full transition-all", getStatusColor(result.status))}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {result.status === "under" && result.budget - result.spent > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Sobrou {formatCurrency(result.budget - result.spent)}!
                    </p>
                  )}
                  {result.status === "over" && (
                    <p className="text-[10px] text-red-600 dark:text-red-400">
                      Passou {formatCurrency(result.spent - result.budget)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-sm text-muted-foreground">{step.caption}</p>
      </CardContent>
    </Card>
  );
}

export function BudgetExample() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Exemplo Prático</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Veja como funciona na prática, passo a passo
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {/* Step 1 */}
            <div className="relative h-full">
              <Step1Card />
              {/* Arrow (desktop only) */}
              <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative h-full">
              <Step2Card />
              {/* Arrow (desktop only) */}
              <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="h-full">
              <Step3Card />
            </div>
          </div>

          {/* Mobile Step Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 md:hidden">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              1
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              2
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
              3
            </span>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <Link href="/planning">Criar meu orçamento agora</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
