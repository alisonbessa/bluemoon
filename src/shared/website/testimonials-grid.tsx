"use client";

import Image from "next/image";
import { Card, CardContent } from "@/shared/ui/card";

const testimonials = [
  {
    name: "Mariana",
    role: "Designer, 28 anos",
    location: "São Paulo",
    avatar: "/images/depoimento1.png",
    quote:
      "Gente, eu NUNCA consegui manter uma planilha por mais de uma semana. Com o HiveBudget já são 3 meses e ainda tô usando todo dia. O negócio do WhatsApp é genial porque eu registro na hora que gasto, não esqueço mais.",
  },
  {
    name: "Ricardo e Camila",
    role: "Casados há 2 anos",
    location: "Belo Horizonte",
    avatar: "/images/depoimento2.png",
    quote:
      "A gente brigava MUITO por causa de dinheiro. Tipo, eu achava que ela gastava demais, ela achava que eu era mão de vaca. Agora tá tudo no app, cada um tem seu espacinho mas a gente vê os gastos da casa junto. Mudou nosso relacionamento real.",
  },
  {
    name: "Fernando",
    role: "Desenvolvedor freelancer",
    location: "Curitiba",
    avatar: "/images/depoimento3.PNG",
    quote:
      "Como freela minha renda varia muito né, um mês vem bem, outro vem menos. O HiveBudget me ajudou a parar de torrar tudo quando vem mais e guardar pros meses magros. Parece óbvio mas eu nunca tinha conseguido fazer isso antes.",
  },
  {
    name: "Juliana",
    role: "Analista de marketing",
    location: "Porto Alegre",
    avatar: "/images/depoimento4.PNG",
    quote:
      "Eu tinha uns 5 parcelamentos no cartão e nunca sabia quanto ia vir a fatura. Agora eu vejo tudo organizado, sei exatamente quanto já comprometi do meu limite e quanto ainda posso gastar. Acabou a surpresa no fechamento!",
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
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
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
