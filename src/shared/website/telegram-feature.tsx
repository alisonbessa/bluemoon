"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Check } from "lucide-react";
import { ImagePlaceholder } from "@/shared/ui/image-placeholder";

const features = [
  "Registre gastos por texto: 'gastei 80 no mercado'",
  "Envie foto de nota fiscal ou comprovante Pix",
  "Mande áudio descrevendo o gasto",
  "Consulte seu saldo: 'quanto tenho de alimentação?'",
  "Receba alertas quando estiver perto do limite",
];

export function TelegramFeature() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold md:text-4xl">
                Controle por Mensagem
              </h2>
              <p className="text-lg text-muted-foreground">
                Registre gastos sem abrir nenhum app. Mande uma mensagem, foto
                do comprovante ou até áudio para o nosso assistente inteligente
                no seu app de mensagens favorito.
              </p>

              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <Button size="lg" asChild>
                  <Link href="#pricing">Experimentar 30 dias grátis</Link>
                </Button>
              </div>
            </div>

            <div>
              <ImagePlaceholder
                description="Mockup grande de celular mostrando conversa em app de mensagens. Sequência de mensagens: Usuário: 'gastei 45 no ifood' - HiveBudget: '✅ Registrado! Alimentação - R$ 45,00. Orçamento: R$ 455/600 usado. Você ainda tem R$ 145 para alimentação este mês'. Usuário: [imagem de comprovante Pix] - HiveBudget: '✅ Comprovante recebido! Mercado Extra - R$ 127,50. Categoria: Alimentação'. Visual: bolhas de chat, ícone do HiveBudget como avatar do assistente."
                className="h-[500px]"
                aspectRatio="auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
