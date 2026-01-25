import { AppConfigPublic } from "./types";

export const appConfig: AppConfigPublic = {
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
    "YNAB Brasil",
    "Cartão de Crédito",
    "Parcelamento",
    "Controle Financeiro por Mensagem",
  ],
  description:
    "HiveBudget: A melhor forma de controlar suas finanças pessoais ou em grupo. Organize suas receitas, despesas e metas financeiras de forma colaborativa. Inspirado no YNAB, adaptado para o Brasil com suporte a parcelamentos, cartões de crédito e registro por mensagem.",
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
