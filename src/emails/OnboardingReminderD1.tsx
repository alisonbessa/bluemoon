import * as React from "react";
import { Button, Text, Hr } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface OnboardingReminderD1Props {
  userName: string;
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
      previewText={`Falta pouco pra você começar no ${appConfig.projectName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Oi, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Sou o Alison, criador do {appConfig.projectName}. Vi que você criou
        uma conta ontem mas ainda não terminou a configuração inicial.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O setup leva uns 3 minutos e é o que faz o app começar a funcionar
        de verdade pra você (categorias, contas, parceiro de orçamento).
      </Text>

      <Button
        href={setupUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Continuar configuração
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se travou em alguma parte, me responde esse e-mail contando o que
        aconteceu. Leio e respondo pessoalmente.
      </Text>
    </Layout>
  );
}
