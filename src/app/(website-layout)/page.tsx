import type { Metadata } from "next";
import { WebsiteFAQs } from "@/shared/website/faqs";
import { CTA2 } from "@/shared/website/cta-2";
import Hero2 from "@/shared/sections/hero-2";
import MonthlyAnnualPricing from "@/shared/website/monthly-annual-pricing";
import TextRevealByWord from "@/shared/ui/text-reveal";
import { StructuredData } from "@/shared/seo/StructuredData";
import { PainPoints } from "@/shared/website/pain-points";
import { Solution } from "@/shared/website/solution";
import HowItWorks from "@/shared/website/how-it-works";
import { BudgetExample } from "@/shared/website/budget-example";
import { TelegramFeature } from "@/shared/website/telegram-feature";
import { ForCouples } from "@/shared/website/for-couples";
import { ComparisonTable } from "@/shared/website/comparison-table";
import { TestimonialsGrid } from "@/shared/website/testimonials-grid";

function FAQPageSchema({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export const metadata: Metadata = {
  title: "HiveBudget - Organize o Dinheiro do Casal",
  description:
    "Organize as finanças do casal sem planilha. Planejem juntos, registrem gastos por mensagem no WhatsApp e saibam para onde vai cada real. Comece gratis!",
  keywords: [
    "controle financeiro casal",
    "orçamento casal",
    "finanças para casais",
    "organizar dinheiro casal",
    "dividir contas casal",
    "planejamento financeiro casal",
    "app para casais",
    "controle de gastos compartilhado",
    "hivebudget",
    "como organizar dinheiro em casal",
  ],
  openGraph: {
    title: "HiveBudget - Organize o Dinheiro do Casal",
    description:
      "Planejem juntos, registrem gastos por mensagem no WhatsApp e saibam para onde vai cada real. Feito para casais brasileiros.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL,
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: "HiveBudget - Organize o dinheiro do casal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HiveBudget - Organize o Dinheiro do Casal",
    description: "Planejem juntos, registrem gastos por mensagem no WhatsApp. Comece gratis!",
    images: ["/images/og.png"],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
};

const faqItems = [
  {
    question: "Como funciona o orçamento compartilhado?",
    answer:
      "Você cria um orçamento e convida seu parceiro(a). Vocês veem as mesmas contas, categorias e transações em tempo real — mas cada um mantém seu espaço para gastos pessoais.",
  },
  {
    question: "Meu parceiro(a) precisa pagar também?",
    answer:
      "Não! Quem cria a conta é o único que paga. No plano Duo, você convida seu parceiro(a) e ele(a) tem acesso grátis ao orçamento compartilhado.",
  },
  {
    question: "Como funciona o registro por mensagem?",
    answer:
      "Você conecta seu WhatsApp e pode registrar gastos mandando texto, foto de comprovante ou áudio. O HiveBudget entende e categoriza automaticamente com IA. Também pode consultar saldo e orçamento por lá.",
  },
  {
    question: "O que é o 'acerto do mês'?",
    answer:
      "Quando um dos dois paga mais gastos compartilhados da conta pessoal, o HiveBudget calcula automaticamente quanto o outro deve. No fim do mês, vocês sabem exatamente quem deve quanto a quem.",
  },
  {
    question: "Como funciona o planejamento do orçamento?",
    answer:
      "Vocês definem juntos para onde cada real vai ANTES de gastar. Diferente de apps que apenas rastreiam gastos, vocês planejam ativamente, evitando surpresas no fim do mês.",
  },
  {
    question: "Posso ter meus gastos pessoais privados?",
    answer:
      "Sim! Vocês escolhem o nível de privacidade: desde transparência total até gastos pessoais completamente privados. Cada casal decide o que funciona melhor.",
  },
  {
    question: "Tem integração com bancos brasileiros?",
    answer:
      "Em breve via Open Banking. Por enquanto, vocês registram gastos pelo WhatsApp (leva 5 segundos) ou direto no app.",
  },
  {
    question: "Como funciona o período de beta?",
    answer:
      "Durante o beta, todas as funcionalidades são gratuitas, sem limite de uso. Sem cartão de crédito. Quem participar do beta terá condições exclusivas no lançamento.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim! Cancele a qualquer momento sem burocracia. Seus dados são preservados se quiser voltar depois.",
  },
  {
    question: "É seguro colocar minhas informações financeiras?",
    answer:
      "Sim! Seus dados são protegidos com conexão segura (HTTPS) e nunca pedimos senha de banco. Você registra as transações manualmente ou por mensagem.",
  },
];

export default function WebsiteHomepage() {
  return (
    <>
      <StructuredData type="WebSite" />
      <StructuredData type="SoftwareApplication" />
      <StructuredData type="Organization" />
      <FAQPageSchema items={faqItems} />

      {/* 1. Hero — Identidade + Promessa */}
      <div className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/20">
        <Hero2 />
      </div>

      {/* 2. Dor Emocional — Problema + Agitação */}
      <div className="relative bg-background">
        <PainPoints />
      </div>

      {/* Transição emocional */}
      <TextRevealByWord text="Pela primeira vez, a gente sabe para onde cada real vai. Não é sobre gastar menos — é sobre gastar juntos, com intenção." />

      {/* 3. Solução — Resposta simples */}
      <div className="relative bg-background">
        <Solution />
      </div>

      {/* 4. Diferencial Principal — Registro por mensagem (DESTAQUE MÁXIMO) */}
      <div className="relative bg-background">
        <TelegramFeature />
      </div>

      {/* 5. Para Casais — Reforça identidade */}
      <div className="relative bg-muted/5 dark:bg-muted/5">
        <ForCouples />
      </div>

      {/* 6. Como Funciona — Processo em 4 passos */}
      <div id="como-funciona" className="relative bg-muted/5 dark:bg-muted/5">
        <HowItWorks />
      </div>

      {/* 7. Tabela Comparativa — Contexto competitivo */}
      <div className="relative bg-background">
        <ComparisonTable />
      </div>

      {/* 8. Exemplo Prático — Prova concreta */}
      <div className="relative bg-background">
        <BudgetExample />
      </div>

      {/* 9. Depoimentos — Prova social */}
      <div id="depoimentos" className="relative bg-muted/5 dark:bg-muted/5">
        <TestimonialsGrid />
      </div>

      {/* 10. Pricing */}
      <div id="pricing" className="relative pt-16 bg-background">
        <MonthlyAnnualPricing />
      </div>

      {/* 11. FAQ */}
      <div id="faq" className="relative bg-background">
        <WebsiteFAQs items={faqItems} />
      </div>

      {/* 12. CTA Final */}
      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CTA2 />
      </div>
    </>
  );
}
