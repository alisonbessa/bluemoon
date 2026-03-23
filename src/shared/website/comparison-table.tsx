"use client";

import React from "react";
import { Check, X, Minus } from "lucide-react";

const features = [
  {
    name: "Feito para casal",
    hive: "yes",
    spreadsheet: "no",
    apps: "no",
  },
  {
    name: "Fácil de manter no dia a dia",
    hive: "yes",
    spreadsheet: "no",
    apps: "partial",
  },
  {
    name: "Planejamento antes de gastar",
    hive: "yes",
    spreadsheet: "partial",
    apps: "no",
  },
  {
    name: "Registro por mensagem",
    hive: "yes",
    spreadsheet: "no",
    apps: "no",
  },
  {
    name: "Privacidade individual",
    hive: "yes",
    spreadsheet: "no",
    apps: "no",
  },
  {
    name: "Acerto automático do mês",
    hive: "yes",
    spreadsheet: "no",
    apps: "no",
  },
] as const;

type Status = "yes" | "no" | "partial";

function StatusIcon({ status }: { status: Status }) {
  if (status === "yes") {
    return (
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  if (status === "no") {
    return (
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <X className="h-4 w-4 text-red-500 dark:text-red-400" />
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
      <Minus className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    </div>
  );
}

export function ComparisonTable() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Por que o HiveBudget?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Veja como nos comparamos com as alternativas mais comuns
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-4 text-left font-medium text-muted-foreground text-sm">
                    Funcionalidade
                  </th>
                  <th className="py-4 text-center font-bold text-primary text-sm min-w-[100px]">
                    HiveBudget
                  </th>
                  <th className="py-4 text-center font-medium text-muted-foreground text-sm min-w-[100px]">
                    Planilha
                  </th>
                  <th className="py-4 text-center font-medium text-muted-foreground text-sm min-w-[100px]">
                    Apps comuns
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={index}
                    className="border-b last:border-0"
                  >
                    <td className="py-4 text-sm font-medium">{feature.name}</td>
                    <td className="py-4 text-center">
                      <StatusIcon status={feature.hive} />
                    </td>
                    <td className="py-4 text-center">
                      <StatusIcon status={feature.spreadsheet} />
                    </td>
                    <td className="py-4 text-center">
                      <StatusIcon status={feature.apps} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
