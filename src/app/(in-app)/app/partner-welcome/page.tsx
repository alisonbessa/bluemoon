"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useSWR from "swr";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { appConfig } from "@/shared/lib/config";
import { PRIVACY_MAP } from "@/shared/lib/privacy";
import {
  ArrowRight,
  Wallet,
  Shield,
  Eye,
  Lock,
  MessageCircle,
  Users,
  Plus,
} from "lucide-react";

interface BudgetsResponse {
  budgets: { id: string; name: string; privacyMode?: string }[];
}

const PRIVACY_ICONS = {
  visible: Eye,
  unified: Users,
  private: Lock,
};

const PRIVACY_PARTNER_DESCRIPTIONS = {
  visible:
    "Vocês podem ver tudo um do outro: transações, contas e metas. Transparência total.",
  unified:
    "Vocês veem o orçamento junto, como se fosse uma conta só. Os detalhes das compras individuais ficam privados.",
  private:
    "Cada um tem total privacidade sobre contas, metas e transações pessoais. Só o que é compartilhado aparece para os dois.",
};

export default function PartnerWelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const { data: budgetsData } = useSWR<BudgetsResponse>("/api/app/budgets");
  const budget = budgetsData?.budgets?.[0];
  const privacyMode = (budget?.privacyMode || "visible") as "visible" | "unified" | "private";
  const privacyInfo = PRIVACY_MAP[privacyMode];
  const PrivacyIcon = PRIVACY_ICONS[privacyMode] || Shield;
  const privacyDescription = PRIVACY_PARTNER_DESCRIPTIONS[privacyMode];

  const handleFinish = () => {
    localStorage.setItem("hivebudget_partner_welcome_done", "true");
    router.push("/app");
  };

  const steps = [
    // Step 0: Welcome
    {
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Bem-vindo ao orçamento compartilhado!
            </h2>
            <p className="text-muted-foreground">
              Seu parceiro(a) já configurou o básico. Agora vocês vão
              gerenciar o dinheiro juntos.
            </p>
          </div>
          <div className="text-left space-y-4">
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <Wallet className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Cada real tem uma função</p>
                  <p className="text-xs text-muted-foreground">
                    O orçamento define para onde o dinheiro vai antes de
                    vocês gastarem. Sem surpresas no fim do mês.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <PrivacyIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">
                    Privacidade: {privacyInfo?.label || "Visível"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {privacyDescription}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vocês podem alterar isso em Configurações (requer aceite de ambos).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(1)}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    },
    // Step 1: What's already configured
    {
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">O que já está pronto</h2>
            <p className="text-muted-foreground">
              Seu parceiro(a) já configurou as categorias, contas e fontes
              de renda do orçamento. Você pode ajustar tudo depois em
              Planejamento.
            </p>
          </div>
          <div className="text-left space-y-3">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Você pode:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  Registrar gastos pelo app ou por mensagem (WhatsApp/Telegram)
                </li>
                <li>
                  Ver o orçamento compartilhado e acompanhar o progresso
                </li>
                <li>
                  Adicionar suas próprias contas (cartão, banco)
                </li>
                <li>
                  Criar metas pessoais ou compartilhadas
                </li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep(0)}
            >
              Voltar
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(2)}>
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ),
    },
    // Step 2: Quick start with quick wins
    {
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Comece agora!</h2>
            <p className="text-muted-foreground">
              Dicas para aproveitar o app ao máximo.
            </p>
          </div>
          <div className="text-left space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Registre seu primeiro gasto</p>
                  <p className="text-xs text-muted-foreground">
                    Use o botão &quot;+ Nova Transação&quot; no menu ou Ctrl+N.
                    Leva menos de 10 segundos.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Conecte o WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Registre gastos por mensagem — é o jeito mais rápido.
                    Configure em Configurações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Voltar
            </Button>
            <Button size="lg" className="flex-1" onClick={handleFinish}>
              Ir para o Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/assets/logo.png"
            alt={appConfig.projectName}
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold">{appConfig.projectName}</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {steps[step].content}
      </div>
    </div>
  );
}
