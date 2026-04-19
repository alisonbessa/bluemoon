import * as React from "react";
import { Button, Text, Hr } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface OnboardingReminderD1Props {
  userName?: string | null;
  setupUrl: string;
  unsubscribeUrl: string;
}

export default function OnboardingReminderD1({
  userName,
  setupUrl,
  unsubscribeUrl,
}: OnboardingReminderD1Props) {
  return (
    <Layout
      previewText={`Falta pouco para você começar no ${appConfig.projectName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        {userName ? `Olá, ${userName}.` : "Olá."}
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Sou o Alison, criador do {appConfig.projectName}. Notei que você
        começou a criar sua conta, mas ainda não concluiu a configuração
        inicial.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        A configuração leva cerca de 3 minutos e é o que permite ao app
        funcionar do jeito certo para você — categorias, contas e, se
        fizer sentido, convite para um parceiro de orçamento.
      </Text>

      <Button
        href={setupUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Continuar configuração
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se travou em alguma parte, basta responder este e-mail contando
        o que aconteceu. Leio e respondo pessoalmente.
      </Text>
    </Layout>
  );
}
