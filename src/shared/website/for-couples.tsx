"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Heart, Users } from "lucide-react";
import { ImagePlaceholder } from "@/shared/ui/image-placeholder";

const coupleFeatures = [
  "Orçamento compartilhado para gastos da casa",
  "Espaço privado para gastos pessoais de cada um",
  "Transparência nas decisões financeiras do casal",
  "Objetivos em conjunto: viagem, casa nova, reserva",
];

const familyFeatures = [
  "Filhos podem participar e aprender sobre dinheiro",
  "Controle de mesada com limites por categoria",
  "Objetivos em família que todos acompanham",
  "Cada membro vê o que faz sentido para ele",
];

export function ForCouples() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Perfeito para quem divide a vida
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Gerencie dinheiro junto sem perder a privacidade. Cada um com seu
              espaço, decisões grandes tomadas em conjunto.
            </p>
          </div>

          {/* Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Couples Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
                    <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <CardTitle>Para Casais</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {coupleFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-pink-600">•</span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Families Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Para Famílias</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {familyFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600">•</span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Image */}
            <div className="lg:row-span-1">
              <ImagePlaceholder
                description="Ilustração de casal sentado no sofá, cada um com seu celular, ambos sorrindo enquanto olham o app. Acima deles, ícones flutuando representando: casa, carro, avião (viagem), coração. Estilo moderno, flat design, cores quentes e acolhedoras. Pode incluir o mascote Buzz entre eles."
                className="h-full min-h-[300px]"
                aspectRatio="auto"
              />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <Link href="/sign-up?plan=family">Começar com meu parceiro(a)</Link>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              Apenas quem cria a conta paga. Convide quantas pessoas quiser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
