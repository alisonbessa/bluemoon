import type { Metadata } from "next";
import { WebsiteFAQs } from "@/shared/website/faqs";
import { CTA2 } from "@/shared/website/cta-2";
import Hero2 from "@/shared/sections/hero-2";
import CTA1 from "@/shared/website/cta-1";
import MonthlyAnnualPricing from "@/shared/website/monthly-annual-pricing";
import TextRevealByWord from "@/shared/ui/text-reveal";
import { StructuredData } from "@/shared/seo/StructuredData";
import { PainPoints } from "@/shared/website/pain-points";
import HowItWorks from "@/shared/website/how-it-works";
import { BudgetExample } from "@/shared/website/budget-example";
import { TelegramFeature } from "@/shared/website/telegram-feature";
import { ForCouples } from "@/shared/website/for-couples";
import { TestimonialsGrid } from "@/shared/website/testimonials-grid";

export const metadata: Metadata = {
  title: "HiveBudget - Controle Financeiro Colaborativo para Casais e Famílias",
  description:
    "Planeje suas finanças em grupo com o HiveBudget. Dashboards claros, orçamento inteligente e colaboração em tempo real. Perfeito para casais, famílias e freelancers. Comece grátis!",
  keywords: [
    "controle financeiro",
    "orçamento familiar",
    "planejamento financeiro",
    "finanças colaborativas",
    "orçamento casal",
    "gestão financeira",
    "app orçamento",
    "dashboard financeiro",
    "controle de gastos",
    "hivebudget",
  ],
  openGraph: {
    title: "HiveBudget - Controle Financeiro Colaborativo",
    description:
      "Organize suas finanças em grupo com dashboards claros e colaboração em tempo real. Perfeito para casais, famílias e freelancers brasileiros.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL,
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "HiveBudget - Dashboard de Planejamento Financeiro Colaborativo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HiveBudget - Controle Financeiro Colaborativo",
    description: "Organize suas finanças em grupo. Comece grátis!",
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const faqItems = [
  {
    question: "Como funciona o orçamento compartilhado?",
    answer:
      "Você cria um orçamento e pode adicionar membros da família (parceiro, filhos). Todos veem as mesmas contas, categorias e transações em tempo real. Perfeito para casais e famílias organizarem as finanças juntos.",
  },
  {
    question: "Como funciona o período de teste?",
    answer:
      "Você testa todas as funcionalidades por 30 dias gratuitamente. Se não quiser continuar, basta cancelar antes do fim do período - sem cobrança nenhuma.",
  },
  {
    question: "Quantos membros posso adicionar?",
    answer:
      "Depende do plano: Solo permite 1 pessoa, Duo permite 2 (você e seu parceiro/a). Apenas quem cria a conta paga - membros convidados têm acesso grátis ao orçamento compartilhado.",
  },
  {
    question: "Como funciona o planejamento do orçamento?",
    answer:
      "Você atribui cada real do seu dinheiro ANTES de gastar. Diferente de apps que apenas rastreiam gastos, você planeja ativamente para onde cada centavo vai, evitando surpresas no fim do mês.",
  },
  {
    question: "Como convido alguém para o orçamento?",
    answer:
      "Gere um link de convite ou envie por e-mail diretamente da área de membros. Apenas você (quem criou a conta) paga - membros convidados têm acesso grátis.",
  },
  {
    question: "Quais métodos de pagamento vocês aceitam?",
    answer:
      "Cartão de crédito via Stripe, com cobrança mensal ou anual. Processamento 100% seguro.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim! Cancele a qualquer momento sem burocracia. Durante o período de teste, você não é cobrado se cancelar antes dos 30 dias. Seus dados são preservados se quiser voltar depois.",
  },
  {
    question: "Tem integração com bancos brasileiros?",
    answer:
      "Em breve via Open Banking para importação automática de transações. Por enquanto, você adiciona transações manualmente ou pelo app de mensagens (é rápido e simples).",
  },
  {
    question: "O que significa 'orçamento primeiro'?",
    answer:
      "Diferente de apps que só rastreiam gastos, no HiveBudget você define ANTES para onde cada real vai. Assim você toma decisões conscientes e não tem surpresa no fim do mês.",
  },
  {
    question: "Como funciona o registro por mensagem?",
    answer:
      "Você conecta seu app de mensagens favorito e pode registrar gastos mandando texto, foto de comprovante ou até áudio. O HiveBudget entende e categoriza automaticamente com IA. Também pode consultar seu saldo e orçamento por lá.",
  },
  {
    question: "Meu parceiro(a) precisa pagar também?",
    answer:
      "Não! Quem cria a conta é o único que paga. No plano Duo, você convida seu parceiro(a) e ele(a) tem acesso grátis ao orçamento compartilhado.",
  },
  {
    question: "É seguro colocar minhas informações financeiras?",
    answer:
      "Sim! Seus dados são protegidos com conexão segura (HTTPS) e nunca pedimos senha de banco. Você registra as transações manualmente ou por mensagem, não conectamos direto na sua conta bancária.",
  },
];

export default function WebsiteHomepage() {
  return (
    <>
      <StructuredData type="WebSite" />
      <StructuredData type="SoftwareApplication" />
      <StructuredData type="Organization" />

      <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/20">
        <Hero2 />
      </div>

      <div className="relative bg-background">
        <PainPoints />
      </div>

      <div id="como-funciona" className="relative bg-muted/5 dark:bg-muted/5">
        <HowItWorks />
      </div>

      <div className="relative bg-background">
        <BudgetExample />
      </div>

      <CTA1 />

      <TextRevealByWord text="Com o HiveBudget, finalmente consegui entender para onde ia meu dinheiro. Hoje, eu e minha esposa planejamos juntos e não brigamos mais por gastos surpresa." />

      <div className="relative bg-background">
        <TelegramFeature />
      </div>

      <div className="relative bg-muted/5 dark:bg-muted/5">
        <ForCouples />
      </div>

      <div id="pricing" className="relative pt-16 bg-background">
        <MonthlyAnnualPricing />
      </div>

      <div id="depoimentos" className="relative bg-muted/5 dark:bg-muted/5">
        <TestimonialsGrid />
      </div>

      <div id="faq" className="relative bg-background">
        <WebsiteFAQs items={faqItems} />
      </div>

      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CTA2 />
      </div>
    </>
  );
}
