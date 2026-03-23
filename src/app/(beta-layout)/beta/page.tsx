import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";
import { cn } from "@/shared/lib/utils";
import { AnimatedGridPattern } from "@/shared/magicui/animated-grid-pattern";
import {
  Rocket,
  MessageSquareHeart,
  Gift,
  Wrench,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Acesso Gratuito ao Beta",
  description:
    "O HiveBudget está em beta e você pode usar 100% grátis. Aproveite o acesso completo enquanto construímos o futuro do controle financeiro colaborativo.",
  openGraph: {
    title: "Acesso Gratuito ao Beta",
    description:
      "O HiveBudget está em beta e você pode usar 100% grátis. Aproveite o acesso completo enquanto construímos o futuro do controle financeiro colaborativo.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/beta`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "Acesso Gratuito ao Beta",
      },
    ],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/beta`,
  },
};

const steps = [
  {
    icon: Rocket,
    title: "100% grátis agora",
    description:
      "Todas as funcionalidades liberadas, sem limite de uso. Enquanto estamos em beta, você não paga nada.",
  },
  {
    icon: MessageSquareHeart,
    title: "Sua opinião vale ouro",
    description:
      "Você usa no dia a dia e nos conta o que faz sentido. É assim que o HiveBudget vai se tornar exatamente o que você precisa.",
  },
  {
    icon: Wrench,
    title: "Novidades toda semana",
    description:
      "A plataforma evolui rápido e você acompanha tudo de perto. Funcionalidades novas chegam com frequência.",
  },
  {
    icon: Gift,
    title: "Desconto garantido no lançamento",
    description:
      "Quem entra agora ganha condições especiais quando o beta acabar. Um agradecimento por fazer parte desde o início.",
  },
];

export default function BetaPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center relative overflow-hidden py-12">
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className={cn(
          "mask-[radial-gradient(600px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[150%] skew-y-12"
        )}
      />

      <div className="container max-w-2xl px-4 z-50">
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Rocket className="mr-2 h-4 w-4" />
            Beta Gratuito
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Use o {appConfig.projectName} de graça{" "}
            <span className="text-primary">agora</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-balance">
            Estamos em beta e isso é uma boa notícia pra você: acesso completo
            a todas as funcionalidades, sem pagar nada. Aproveite enquanto dura.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Sem cartão. Sem compromisso. Acesso total ao beta.
          </p>
        </div>
      </div>
    </div>
  );
}
