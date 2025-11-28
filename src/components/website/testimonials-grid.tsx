"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

const testimonials = [
  {
    name: "Mariana",
    role: "Designer, 28 anos",
    location: "São Paulo",
    avatarDescription:
      "Foto de mulher jovem, cabelo escuro, sorrindo, fundo neutro, estilo foto de perfil casual",
    quote:
      "Gente, eu NUNCA consegui manter uma planilha por mais de uma semana. Com o HiveBudget já são 3 meses e ainda tô usando todo dia. O negócio do WhatsApp é genial porque eu registro na hora que gasto, não esqueço mais.",
  },
  {
    name: "Ricardo e Camila",
    role: "Casados há 2 anos",
    location: "Belo Horizonte",
    avatarDescription:
      "Foto de casal jovem, abraçados, sorrindo, ambiente casual, estilo foto de celular",
    quote:
      "A gente brigava MUITO por causa de dinheiro. Tipo, eu achava que ela gastava demais, ela achava que eu era mão de vaca. Agora tá tudo no app, cada um tem seu espacinho mas a gente vê os gastos da casa junto. Mudou nosso relacionamento real.",
  },
  {
    name: "Fernando",
    role: "Desenvolvedor freelancer",
    location: "Curitiba",
    avatarDescription:
      "Foto de homem jovem, barba, óculos, fundo de home office, estilo casual",
    quote:
      "Como freela minha renda varia muito né, um mês vem bem, outro vem menos. O HiveBudget me ajudou a parar de torrar tudo quando vem mais e guardar pros meses magros. Parece óbvio mas eu nunca tinha conseguido fazer isso antes.",
  },
  {
    name: "Dona Célia",
    role: "Mãe de 3, professora",
    location: "Recife",
    avatarDescription:
      "Foto de mulher madura, cabelo curto, sorriso acolhedor, fundo simples, estilo natural",
    quote:
      "Meus filhos adolescentes agora têm mesada pelo app e eles mesmos controlam. Minha filha mais velha já tá economizando pro intercâmbio dela! Nunca pensei que ia ver isso acontecer kk",
  },
];

export function TestimonialsGrid() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              O que nossos usuários dizem
            </h2>
            <p className="mt-4 text-muted-foreground">
              Histórias reais de pessoas que transformaram sua relação com o dinheiro
            </p>
          </div>

          {/* Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-background">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <ImagePlaceholder
                        description={testimonial.avatarDescription}
                        className="h-12 w-12 rounded-full"
                        aspectRatio="square"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="mb-3">
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role} • {testimonial.location}
                        </p>
                      </div>
                      <blockquote className="text-sm leading-relaxed text-muted-foreground">
                        &ldquo;{testimonial.quote}&rdquo;
                      </blockquote>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
