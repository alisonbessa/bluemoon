import { AppConfigPublic } from "./types";

export const appConfig: AppConfigPublic = {
  waitlistMode: process.env.NEXT_PUBLIC_WAITLIST_MODE === "true",
  projectName: "HiveBudget",
  projectSlug: "hivebudget",
  keywords: [
    "HiveBudget",
    "Planejamento Financeiro Colaborativo",
    "Orçamento em Grupo",
    "Controle de Despesas",
    "Finanças Pessoais",
    "Finanças para Casais",
    "Finanças para Famílias",
    "Gestão Financeira",
    "Orçamento Familiar",
    "Cartão de Crédito",
    "Parcelamento",
    "Controle Financeiro por Mensagem",
  ],
  description:
    "Controle financeiro para casais e familias. Planeje o orcamento, registre gastos pelo WhatsApp e acompanhe parcelamentos e cartoes de credito.",
  auth: {
    enablePasswordAuth: false,
  },
  legal: {
    address: {
      street: "Rua Funchal, 538",
      city: "São Paulo",
      state: "SP",
      postalCode: "04551-060",
      country: "Brasil",
    },
    email: "suporte@hivebudget.com",
    phone: "",
  },
  social: {
    twitter: "https://twitter.com/hivebudget",
    instagram: "https://instagram.com/hivebudget",
    linkedin: "https://linkedin.com/company/hivebudget",
    facebook: "https://facebook.com/hivebudget",
    youtube: "https://youtube.com/@hivebudget",
  },
  email: {
    senderName: "HiveBudget",
    senderEmail: "suporte@hivebudget.com",
  },
};
