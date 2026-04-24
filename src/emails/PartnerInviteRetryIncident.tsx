import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface PartnerInviteRetryIncidentProps {
  userName: string | null;
  appUrl: string;
  unsubscribeUrl: string;
}

export default function PartnerInviteRetryIncident({
  userName,
  appUrl,
  unsubscribeUrl,
}: PartnerInviteRetryIncidentProps) {
  return (
    <Layout
      previewText={`Corrigimos um problema no convite do seu parceiro(a) no ${appConfig.projectName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        {userName ? `Olá, ${userName}!` : "Olá!"}
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Identificamos nos últimos dias um problema que estava impedindo que
        parceiras e parceiros aceitassem o convite para entrar no seu orçamento
        compartilhado no {appConfig.projectName}. A correção já está no ar.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[24px] m-0">
          <strong>O que fazer agora</strong>
        </Text>
        <Text className="text-foreground text-[14px] leading-[24px] m-0 mt-2">
          Se sua parceira ou parceiro tentou aceitar e viu uma mensagem de erro,
          peça para abrir o link do convite mais uma vez — agora vai funcionar
          normalmente. Caso o link original tenha se perdido, você pode gerar
          um novo direto pelo app.
        </Text>
      </Section>

      <Button
        href={`${appUrl}/app`}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Ir para o {appConfig.projectName}
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Pedimos desculpas pelo transtorno. Qualquer dúvida, é só responder este
        email que a gente resolve pra você.
      </Text>
    </Layout>
  );
}
