import type { Metadata } from "next";
import { WebsiteFAQs } from "@/shared/website/faqs";
import { StructuredData } from "@/shared/seo/StructuredData";
import { TestimonialsGrid } from "@/shared/website/testimonials-grid";
import { CartoonHero } from "@/shared/website/cartoon/cartoon-hero";
import { CartoonPainPoints } from "@/shared/website/cartoon/cartoon-pain-points";
import { CartoonHowItWorks } from "@/shared/website/cartoon/cartoon-how-it-works";
import { CartoonTelegramFeature } from "@/shared/website/cartoon/cartoon-telegram-feature";
import { CartoonForCouples } from "@/shared/website/cartoon/cartoon-for-couples";
import { CartoonPricing } from "@/shared/website/cartoon/cartoon-pricing";
import { CartoonFinalCTA } from "@/shared/website/cartoon/cartoon-final-cta";

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

      {/* Hero — handwritten + cartoon device */}
      <CartoonHero />

      {/* Pain points — quoted cards + reframe */}
      <CartoonPainPoints />

      {/* How it works — 3 steps */}
      <CartoonHowItWorks />

      {/* Telegram / WhatsApp registration */}
      <CartoonTelegramFeature />

      {/* For couples — privacy / settlement / shared goals */}
      <CartoonForCouples />

      {/* Testimonials — kept from previous landing */}
      <div id="depoimentos" className="bg-card/40">
        <TestimonialsGrid />
      </div>

      {/* Pricing — Solo + Duo */}
      <CartoonPricing />

      {/* FAQ — kept for SEO */}
      <div id="faq">
        <WebsiteFAQs items={faqItems} />
      </div>

      {/* Final CTA — gradient violet card */}
      <CartoonFinalCTA />
    </>
  );
}
