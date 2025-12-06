import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Hr } from "@react-email/hr";
import Layout from "./components/Layout";
import { appConfig } from "@/lib/config";

interface InviteAcceptedEmailProps {
  inviterName: string;
  newMemberName: string;
  newMemberEmail: string;
  budgetName: string;
  dashboardUrl?: string;
}

export default function InviteAcceptedEmail({
  inviterName = "João",
  newMemberName = "Maria",
  newMemberEmail = "maria@email.com",
  budgetName = "Orçamento Familiar",
  dashboardUrl = "https://example.com/app",
}: InviteAcceptedEmailProps) {
  return (
    <Html>
      <Layout previewText={`${newMemberName} aceitou seu convite para "${budgetName}"`}>
        <Text className="text-foreground text-[16px]">
          Olá, {inviterName}! 🎉
        </Text>

        <Text className="text-foreground text-[16px]">
          Boas notícias! <strong>{newMemberName}</strong> ({newMemberEmail}) aceitou
          seu convite e agora faz parte do orçamento <strong>&quot;{budgetName}&quot;</strong>.
        </Text>

        <Section className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
          <Text className="text-green-800 text-[14px] m-0 font-medium">
            Novo membro adicionado com sucesso!
          </Text>
          <Text className="text-green-700 text-[14px] m-0 mt-2">
            {newMemberName} agora pode visualizar e adicionar transações,
            gerenciar categorias e acompanhar o orçamento junto com você.
          </Text>
        </Section>

        <Text className="text-foreground text-[14px]">
          Dicas para começar a usar o orçamento compartilhado:
        </Text>

        <Text className="text-muted text-[14px] ml-4">
          • Conversem sobre as categorias e definem juntos o planejamento mensal
        </Text>
        <Text className="text-muted text-[14px] ml-4">
          • Ativem as notificações para acompanhar os gastos em tempo real
        </Text>
        <Text className="text-muted text-[14px] ml-4">
          • Criem metas financeiras para alcançarem objetivos juntos
        </Text>

        <Button
          href={dashboardUrl}
          className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 text-[14px] font-medium"
        >
          Acessar o Orçamento
        </Button>

        <Hr className="border border-solid border-border my-6" />

        <Text className="text-muted text-[12px]">
          Você recebeu este email porque convidou {newMemberName} para compartilhar
          o orçamento no {appConfig.projectName}.
        </Text>
      </Layout>
    </Html>
  );
}
