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
  title: "Seja um Beta Tester",
  description:
    "Use o HiveBudget gratuitamente durante o desenvolvimento e ganhe um desconto exclusivo de lançamento.",
  openGraph: {
    title: "Seja um Beta Tester",
    description:
      "Use o HiveBudget gratuitamente durante o desenvolvimento e ganhe um desconto exclusivo de lançamento.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/beta`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "Seja um Beta Tester",
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
    title: "Acesso gratuito",
    description:
      "Crie sua conta e use todas as funcionalidades da plataforma sem pagar nada enquanto ela estiver em desenvolvimento.",
  },
  {
    icon: MessageSquareHeart,
    title: "Seu feedback constrói o produto",
    description:
      "Conte pra gente o que funciona, o que não funciona e o que faz falta. Seu uso real é o que vai moldar o HiveBudget.",
  },
  {
    icon: Wrench,
    title: "Evolução constante",
    description:
      "Novas funcionalidades são lançadas frequentemente. Você acompanha a evolução de perto e tem voz ativa nas prioridades.",
  },
  {
    icon: Gift,
    title: "Desconto exclusivo de lançamento",
    description:
      "Quando a plataforma sair do beta, você terá um desconto especial como agradecimento por ter feito parte dessa construção.",
  },
];

export default function BetaPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center relative overflow-hidden">
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

      <div className="container max-w-2xl px-4 py-8 z-50">
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Rocket className="mr-2 h-4 w-4" />
            Programa Beta
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Ajude a construir o {appConfig.projectName}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Estamos nas fases iniciais e queremos construir junto com quem vai
            usar de verdade. É simples: você usa de graça, nos conta o que acha,
            e a gente melhora.
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
              Criar minha conta grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Sem cartão de crédito. Sem compromisso. Só feedback honesto.
          </p>
        </div>
      </div>
    </div>
  );
}
