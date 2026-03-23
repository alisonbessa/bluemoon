"use client";

import React from "react";
import { DollarSign, Target, MessageCircle, BarChart3 } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    number: "1",
    icon: DollarSign,
    title: "Definam quanto ganham",
    description:
      "Cada um cadastra sua renda. Decidam juntos quanto vai para o orçamento compartilhado.",
    color: "emerald",
  },
  {
    number: "2",
    icon: Target,
    title: "Planejem para onde vai cada real",
    description:
      "Distribuam o dinheiro em categorias como moradia, mercado e lazer. Tudo definido antes de gastar.",
    color: "blue",
  },
  {
    number: "3",
    icon: MessageCircle,
    title: "Registrem gastos por mensagem",
    description:
      "Gastou? Manda uma mensagem no WhatsApp. Nossa IA entende e registra em segundos.",
    color: "purple",
  },
  {
    number: "4",
    icon: BarChart3,
    title: "Acompanhem juntos",
    description:
      "Dashboards mostram planejado vs. real. No fim do mês, o app calcula quem deve o quê.",
    color: "amber",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="como-funciona" className="bg-white py-16 dark:bg-gray-900 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
            Como funciona
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            4 passos simples para organizar o dinheiro do casal
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
                <div className="relative z-10 flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
      </div>
    </section>
  );
};

export default HowItWorks;
