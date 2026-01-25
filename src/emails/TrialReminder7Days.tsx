import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface TrialReminder7DaysProps {
  userName: string;
  trialEndDate: string;
  settingsUrl: string;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "http://localhost:3000";

export default function TrialReminder7Days({
  userName,
  trialEndDate,
  settingsUrl,
}: TrialReminder7DaysProps) {
  return (
    <Layout previewText={`Seu trial termina em 7 dias - ${appConfig.projectName}`}>
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Passando para lembrar que seu período de trial no {appConfig.projectName}{" "}
        <strong>termina em 7 dias</strong>, no dia {trialEndDate}.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[24px] m-0">
          Você está aproveitando todas as funcionalidades? Esperamos que sim!
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Após o trial, sua assinatura será ativada automaticamente. Se quiser
        continuar usando o {appConfig.projectName}, não precisa fazer nada!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Caso não queira continuar, você pode cancelar a qualquer momento nas
        configurações do app, sem nenhuma cobrança.
      </Text>

      <Button
        href={settingsUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Ver Configurações
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Dúvidas? Responda este email que teremos prazer em ajudar!
      </Text>
    </Layout>
  );
}
