"use client";

import React from "react";
import { DollarSign, Target, TrendingUp, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    number: "1",
    icon: DollarSign,
    title: "Planeje seu dinheiro",
    description:
      "Informe suas rendas e distribua cada real para categorias (alimentação, moradia, lazer). Atribua ANTES de gastar.",
    color: "emerald",
    badge: "Planejamento",
  },
  {
    number: "2",
    icon: Target,
    title: "Registre seus gastos",
    description:
      "Conforme você gasta no dia a dia, registre as despesas. Cada gasto é deduzido do valor planejado da categoria.",
    color: "blue",
    badge: "Acompanhamento",
  },
  {
    number: "3",
    icon: TrendingUp,
    title: "Compare planejado vs. real",
    description:
      "Veja dashboards claros mostrando quanto você planejou gastar e quanto realmente gastou. Identifique onde está desviando.",
    color: "purple",
    badge: "Acompanhamento",
  },
  {
    number: "4",
    icon: CheckCircle,
    title: "Ajuste e melhore",
    description:
      "Analise os relatórios e ajuste o planejamento do próximo mês. Aprenda seus padrões de consumo e melhore continuamente.",
    color: "amber",
    badge: "Melhoria",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="como-funciona" className="bg-white py-16 dark:bg-gray-900 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
            Veja como funciona na prática
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Planeje primeiro, acompanhe depois. É assim que você toma controle do seu dinheiro.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="group relative"
              >
                {/* Card */}
                <div className="relative z-10 flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {/* Badge */}
                  <div className="mb-4 inline-block w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {step.badge}
                  </div>

                  {/* Step Number & Icon */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {step.number}
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${
                        step.color === "emerald"
                          ? "from-emerald-500 to-emerald-600"
                          : step.color === "blue"
                            ? "from-blue-500 to-blue-600"
                            : step.color === "purple"
                              ? "from-purple-500 to-purple-600"
                              : "from-amber-500 to-amber-600"
                      }`}
                    >
                      <Icon className="h-8 w-8 text-white" />
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Planeje primeiro, gaste depois.
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            É o método mais eficaz para ter controle financeiro. Sem planilhas complicadas, sem surpresas.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
