import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface TrialReminder2DaysProps {
  userName: string;
  trialEndDate: string;
  settingsUrl: string;
  planName: string;
  planPrice: string;
}

export default function TrialReminder2Days({
  userName,
  trialEndDate,
  settingsUrl,
  planName,
  planPrice,
}: TrialReminder2DaysProps) {
  return (
    <Layout previewText={`Seu trial termina em 2 dias - ${appConfig.projectName}`}>
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Seu período de trial no {appConfig.projectName} está quase acabando!{" "}
        <strong>Restam apenas 2 dias</strong> (até {trialEndDate}).
      </Text>

      <Section className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
        <Text className="text-amber-800 text-[14px] leading-[24px] m-0 font-semibold">
          O que acontece depois?
        </Text>
        <Text className="text-amber-700 text-[13px] leading-[20px] m-0 mt-2">
          Sua assinatura <strong>{planName}</strong> será ativada automaticamente
          no valor de <strong>{planPrice}</strong>.
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Se você está gostando do {appConfig.projectName}, ótimo! Não precisa fazer nada.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Caso prefira não continuar, cancele antes do trial acabar para evitar
        qualquer cobrança.
      </Text>

      <Button
        href={settingsUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Gerenciar Assinatura
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Alguma dúvida ou feedback? Responda este email - adoramos ouvir você!
      </Text>
    </Layout>
  );
}
