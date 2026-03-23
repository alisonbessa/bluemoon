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
  Heart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Acesso Gratuito ao Beta",
  description:
    "O HiveBudget está em beta e você pode usar 100% grátis. Ajude a construir a melhor forma de organizar o dinheiro em casal.",
  openGraph: {
    title: "Acesso Gratuito ao Beta",
    description:
      "O HiveBudget está em beta e você pode usar 100% grátis. Ajude a construir a melhor forma de organizar o dinheiro em casal.",
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

const benefits = [
  {
    icon: Rocket,
    title: "100% grátis agora",
    description:
      "Todas as funcionalidades liberadas, sem limite de uso. Enquanto estamos em beta, vocês não pagam nada.",
  },
  {
    icon: MessageSquareHeart,
    title: "Sua opinião molda o produto",
    description:
      "Vocês usam no dia a dia e nos contam o que faz sentido. É assim que o HiveBudget se torna exatamente o que o casal precisa.",
  },
  {
    icon: Wrench,
    title: "Novidades toda semana",
    description:
      "A plataforma evolui rápido e vocês acompanham tudo de perto. Funcionalidades novas chegam com frequência.",
  },
  {
    icon: Gift,
    title: "Condições exclusivas no lançamento",
    description:
      "Quem entra agora ganha desconto especial quando o beta acabar. Um agradecimento por fazer parte desde o início.",
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
            <Heart className="mr-2 h-4 w-4" />
            Grupo de Fundadores
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Vocês estão entrando no grupo de fundadores do{" "}
            <span className="text-primary">{appConfig.projectName}</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-balance">
            Ajudem a construir a melhor forma de organizar o dinheiro em casal.
            Acesso completo, gratuito, e a chance de influenciar o produto.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {benefits.map((step) => {
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
              Começar grátis em casal
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
