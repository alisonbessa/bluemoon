import { render } from "@react-email/render";
import { appConfig } from "@/shared/lib/config";
import type { CampaignKey } from "@/db/schema/email-campaigns";

import OnboardingReminderD1 from "@/emails/OnboardingReminderD1";
import OnboardingStuckD7 from "@/emails/OnboardingStuckD7";
import NoTransactionD3 from "@/emails/NoTransactionD3";
import WhatsAppInviteD7 from "@/emails/WhatsAppInviteD7";
import AIAssistantDemoD10 from "@/emails/AIAssistantDemoD10";
import PowerUserFeedback from "@/emails/PowerUserFeedback";
import WinBackD21 from "@/emails/WinBackD21";

export interface CampaignMeta {
  key: CampaignKey;
  /** Display name shown in the admin UI */
  name: string;
  /** Short description of who receives this email and when */
  description: string;
  /** Default subject if the admin hasn't overridden it in the DB */
  defaultSubject: string;
  /** Render the email with the runtime payload (name, URLs, etc.) */
  render: (payload: CampaignRenderPayload) => Promise<string>;
  /** Render a preview HTML with realistic mock data */
  renderPreview: () => Promise<string>;
}

export interface CampaignRenderPayload {
  userName: string | null;
  appUrl: string;
  unsubscribeUrl: string;
  replyMailto: string;
}

const mockPayload = (appUrl = "https://example.com"): CampaignRenderPayload => ({
  userName: "Maria",
  appUrl,
  unsubscribeUrl: `${appUrl}/api/unsubscribe?token=preview`,
  replyMailto: `mailto:${appConfig.legal.email}`,
});

export const CAMPAIGNS_REGISTRY: Record<CampaignKey, CampaignMeta> = {
  onboarding_d1: {
    key: "onboarding_d1",
    name: "Onboarding D+1",
    description:
      "Enviado 1 dia após o signup, se o usuário ainda não completou o onboarding.",
    defaultSubject: `Falta pouco para você começar no ${appConfig.projectName}`,
    render: async (p) =>
      render(
        OnboardingReminderD1({
          userName: p.userName,
          setupUrl: `${p.appUrl}/app/setup`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        OnboardingReminderD1({
          userName: p.userName,
          setupUrl: `${p.appUrl}/app/setup`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  onboarding_stuck_d7: {
    key: "onboarding_stuck_d7",
    name: "Onboarding travado D+7",
    description:
      "Enviado 7 dias após o signup, se o usuário ainda não completou o onboarding. Pede feedback sobre o que travou.",
    defaultSubject: "O que te fez parar?",
    render: async (p) =>
      render(
        OnboardingStuckD7({
          userName: p.userName,
          replyMailto: p.replyMailto,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        OnboardingStuckD7({
          userName: p.userName,
          replyMailto: p.replyMailto,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  no_transaction_d3: {
    key: "no_transaction_d3",
    name: "Sem primeira transação D+3",
    description:
      "Enviado 3 dias após completar o onboarding, se o usuário ainda não registrou nenhuma transação.",
    defaultSubject: "Registre seu primeiro gasto em 10 segundos",
    render: async (p) =>
      render(
        NoTransactionD3({
          userName: p.userName,
          appUrl: p.appUrl,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        NoTransactionD3({
          userName: p.userName,
          appUrl: p.appUrl,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  no_whatsapp_d7: {
    key: "no_whatsapp_d7",
    name: "Sem WhatsApp D+7",
    description:
      "Enviado 7 dias após completar o onboarding, se o usuário não conectou o WhatsApp.",
    defaultSubject: "Registre gastos pelo WhatsApp",
    render: async (p) =>
      render(
        WhatsAppInviteD7({
          userName: p.userName,
          connectUrl: `${p.appUrl}/app/settings`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        WhatsAppInviteD7({
          userName: p.userName,
          connectUrl: `${p.appUrl}/app/settings`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  no_ai_d10: {
    key: "no_ai_d10",
    name: "Sem uso da IA D+10",
    description:
      "Enviado 10 dias após o onboarding, se o usuário não usou o assistente de IA nos últimos 30 dias.",
    defaultSubject: "Já testou o assistente de IA?",
    render: async (p) =>
      render(
        AIAssistantDemoD10({
          userName: p.userName,
          appUrl: p.appUrl,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        AIAssistantDemoD10({
          userName: p.userName,
          appUrl: p.appUrl,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  power_user_feedback: {
    key: "power_user_feedback",
    name: "Feedback de power user",
    description:
      "Enviado uma única vez para usuários com 5+ transações nos últimos 30 dias. Leva ao formulário de survey.",
    defaultSubject: `Posso pedir 3 minutos do seu tempo? · ${appConfig.projectName}`,
    render: async (p) =>
      render(
        PowerUserFeedback({
          userName: p.userName,
          surveyUrl: `${p.appUrl}/app/survey/power-user-v1`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        PowerUserFeedback({
          userName: p.userName,
          surveyUrl: `${p.appUrl}/app/survey/power-user-v1`,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
  winback_d21: {
    key: "winback_d21",
    name: "Win-back D+21",
    description:
      "Enviado para usuários sem nenhuma atividade (transação, IA) há 21+ dias. Pede feedback sobre o que faltou.",
    defaultSubject: "O que faltou?",
    render: async (p) =>
      render(
        WinBackD21({
          userName: p.userName,
          replyMailto: p.replyMailto,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      ),
    renderPreview: async () => {
      const p = mockPayload();
      return render(
        WinBackD21({
          userName: p.userName,
          replyMailto: p.replyMailto,
          unsubscribeUrl: p.unsubscribeUrl,
        })
      );
    },
  },
};

export const CAMPAIGN_KEYS = Object.keys(CAMPAIGNS_REGISTRY) as CampaignKey[];
